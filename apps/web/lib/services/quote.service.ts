import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getMapsProvider } from '@/lib/maps';
import type { DeliveryQuote, PricingRule } from '@repo/shared/types';

export interface QuoteRequest {
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address_text?: string;
  destination_latitude: number;
  destination_longitude: number;
  destination_address_text?: string;
  category_id: string;
  weight_kg?: number;
  quantity?: number;
  urgency_level?: 'standard' | 'express' | 'urgent';
}

export interface QuoteCalculation {
  pricing_rule_id: string;
  base_fee: number;
  distance_fee: number;
  weight_fee: number;
  priority_fee: number;
  subtotal_before_discount: number;
  discount_amount: number;
  subtotal_after_discount: number;
  tax_amount: number;
  total_amount: number;
  distance_km: number;
  estimated_duration_minutes: number;
  currency: string;
  pricing_type: 'same_zone' | 'cross_zone';
  zone_name: string;
}

export class QuoteService {
  async generateQuote(
    customerId: string,
    request: QuoteRequest
  ): Promise<DeliveryQuote> {
    const supabase = await createClient();

    // 1. Calculate route (ONE routing call per quote/order lifecycle)
    // Route result includes distance, duration, and geometry.
    // OrderService will reuse this geometry — no second routing call.
    const maps = getMapsProvider();
    const route = await maps.getRoute(
      { lat: request.pickup_latitude, lon: request.pickup_longitude },
      { lat: request.destination_latitude, lon: request.destination_longitude }
    );

    // 2. Determine zones for pickup and destination
    const pickupZone = await this.findZone(request.pickup_latitude, request.pickup_longitude);
    const destinationZone = await this.findZone(request.destination_latitude, request.destination_longitude);

    // 3. Determine pricing type and calculate
    let calculation: QuoteCalculation;

    if (pickupZone && destinationZone && pickupZone.zone_id !== destinationZone.zone_id) {
      // CROSS-ZONE: route-distance-based pricing (unified with same-zone model)
      // Uses the same distance-based formula as same-zone pricing.
      // Fixed-price zone_pricing_matrix lookup is no longer authoritative.
      calculation = await this.calculateCrossZonePricing(
        pickupZone.zone_id,
        pickupZone.zone_name,
        destinationZone.zone_id,
        destinationZone.zone_name,
        route.distance_km,
        route.duration_minutes,
        request.weight_kg,
        request.urgency_level || 'standard'
      );
    } else if (pickupZone) {
      // SAME-ZONE: distance-based pricing
      const pricingRule = await this.findPricingRule(pickupZone.zone_id);
      if (!pricingRule) {
        throw new Error('No pricing rule available for this location');
      }
      calculation = await this.calculateSameZonePricing(
        pricingRule,
        pickupZone.zone_name,
        route.distance_km,
        route.duration_minutes,
        request.weight_kg,
        request.urgency_level || 'standard'
      );
    } else {
      throw new Error('Service not available in this area');
    }

    // 4. Get quote lifetime from platform settings
    const quoteLifetime = await this.getQuoteLifetime();

    // 5. Store quote
    const { data: quote, error } = await supabase
      .from('delivery_quotes')
      .insert({
        customer_id: customerId,
        pickup_latitude: request.pickup_latitude,
        pickup_longitude: request.pickup_longitude,
        pickup_address_text: request.pickup_address_text,
        destination_latitude: request.destination_latitude,
        destination_longitude: request.destination_longitude,
        destination_address_text: request.destination_address_text,
        category_id: request.category_id,
        weight_kg: request.weight_kg,
        quantity: request.quantity || 1,
        pricing_rule_id: calculation.pricing_rule_id,
        base_fee: calculation.base_fee,
        distance_fee: calculation.distance_fee,
        weight_fee: calculation.weight_fee,
        urgency_fee: calculation.priority_fee,
        discount_amount: calculation.discount_amount,
        tax_amount: calculation.tax_amount,
        total_amount: calculation.total_amount,
        currency: calculation.currency,
        distance_km: calculation.distance_km,
        estimated_duration_minutes: calculation.estimated_duration_minutes,
        valid_until: new Date(Date.now() + quoteLifetime * 1000).toISOString(),
        route_geometry: route.coordinates ? JSON.parse(JSON.stringify(route.coordinates)) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return quote;
  }

  private async findZone(
    latitude: number,
    longitude: number
  ): Promise<{ zone_id: string; zone_name: string } | null> {
    const serviceRole = await createServiceRoleClient();

    const { data: zone } = await serviceRole.rpc('is_in_service_zone', {
      p_lat: latitude,
      p_lon: longitude,
    });

    if (!zone || !zone.length) return null;

    return { zone_id: zone[0].zone_id, zone_name: zone[0].zone_name };
  }

  private async findPricingRule(
    zoneId: string
  ): Promise<PricingRule | null> {
    const serviceRole = await createServiceRoleClient();

    const { data: rule } = await serviceRole
      .from('pricing_rules')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .lte('valid_from', new Date().toISOString())
      .or(`valid_to.is.null,valid_to.gt.${new Date().toISOString()}`)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    return rule;
  }

  /**
   * Same-zone pricing: distance × per_km_rate, with minimum fare
   * customer_price = MAX(distance_km × per_km_rate, minimum_fare) + weight + priority + tax
   */
  private async calculateSameZonePricing(
    rule: PricingRule,
    zoneName: string,
    distanceKm: number,
    durationMinutes: number,
    weightKg: number | undefined,
    urgencyLevel: 'standard' | 'express' | 'urgent'
  ): Promise<QuoteCalculation> {
    // 1. Distance fare = distance × per-km rate
    const distanceFee = distanceKm * rule.per_kilometer;

    // 2. Apply minimum fare (on delivery fare before weight/priority/tax)
    const deliveryFare = Math.max(distanceFee, rule.minimum_fare);

    // 3. Weight surcharge
    let weightMultiplier = 1.0;
    if (weightKg && rule.weight_bands) {
      for (const band of rule.weight_bands) {
        if (weightKg >= band.min_kg && weightKg < band.max_kg) {
          weightMultiplier = band.multiplier;
          break;
        }
      }
    }
    const weightFee = deliveryFare * (weightMultiplier - 1);

    // 4. Priority fee (fixed add-on from platform settings)
    const priorityFee = await this.getPriorityFee(urgencyLevel);

    // 5. Subtotal before discount
    const subtotalBeforeDiscount = deliveryFare + weightFee + priorityFee;

    // 6. Discount (applied later if promo code provided)
    const discountAmount = 0;

    // 7. Subtotal after discount
    const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;

    // 8. Tax on subtotal
    const taxAmount = subtotalAfterDiscount * rule.tax_rate;

    // 9. Total
    const totalAmount = Math.round((subtotalAfterDiscount + taxAmount) * 100) / 100;

    return {
      pricing_rule_id: rule.id,
      base_fee: rule.minimum_fare,
      distance_fee: Math.round(distanceFee * 100) / 100,
      weight_fee: Math.round(weightFee * 100) / 100,
      priority_fee: priorityFee,
      subtotal_before_discount: subtotalBeforeDiscount,
      discount_amount: discountAmount,
      subtotal_after_discount: subtotalAfterDiscount,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: totalAmount,
      distance_km: Math.round(distanceKm * 100) / 100,
      estimated_duration_minutes: durationMinutes,
      currency: 'NGN',
      pricing_type: 'same_zone',
      zone_name: zoneName,
    };
  }

  /**
   * Cross-zone pricing: distance-based (unified with same-zone model).
   * Uses the route-authoritative distance × per-km rate from the origin zone's pricing rule.
   * No fixed-price lookup. Consistent with the founder's route-based pricing direction.
   */
  private async calculateCrossZonePricing(
    originZoneId: string,
    originZoneName: string,
    destinationZoneId: string,
    destinationZoneName: string,
    distanceKm: number,
    durationMinutes: number,
    weightKg: number | undefined,
    urgencyLevel: 'standard' | 'express' | 'urgent'
  ): Promise<QuoteCalculation> {
    // Use the origin zone's pricing rule for distance-based calculation.
    // This ensures consistent pricing regardless of zone crossing direction.
    const pricingRule = await this.findPricingRule(originZoneId);
    if (!pricingRule) {
      throw new Error('No pricing rule available for this route');
    }

    // Apply the same distance-based formula as same-zone pricing
    const distanceFee = distanceKm * pricingRule.per_kilometer;
    const deliveryFare = Math.max(distanceFee, pricingRule.minimum_fare);

    let weightMultiplier = 1.0;
    if (weightKg && pricingRule.weight_bands) {
      for (const band of pricingRule.weight_bands) {
        if (weightKg >= band.min_kg && weightKg < band.max_kg) {
          weightMultiplier = band.multiplier;
          break;
        }
      }
    }
    const weightFee = deliveryFare * (weightMultiplier - 1);

    const priorityFee = await this.getPriorityFee(urgencyLevel);
    const subtotal = deliveryFare + weightFee + priorityFee;
    const taxAmount = subtotal * pricingRule.tax_rate;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    return {
      pricing_rule_id: pricingRule.id,
      base_fee: pricingRule.minimum_fare,
      distance_fee: Math.round(distanceFee * 100) / 100,
      weight_fee: Math.round(weightFee * 100) / 100,
      priority_fee: priorityFee,
      subtotal_before_discount: subtotal,
      discount_amount: 0,
      subtotal_after_discount: subtotal,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: totalAmount,
      distance_km: Math.round(distanceKm * 100) / 100,
      estimated_duration_minutes: durationMinutes,
      currency: 'NGN',
      pricing_type: 'cross_zone',
      zone_name: `${originZoneName} → ${destinationZoneName}`,
    };
  }

  /**
   * Priority fee: configurable fixed add-on from platform_settings
   */
  private async getPriorityFee(urgencyLevel: 'standard' | 'express' | 'urgent'): Promise<number> {
    if (urgencyLevel === 'standard') return 0;

    const serviceRole = await createServiceRoleClient();
    const { data } = await serviceRole
      .from('platform_settings')
      .select('value')
      .eq('key', 'priority_delivery_fee')
      .single();

    if (!data?.value) return 0;

    const fee = Number(data.value.amount || 0);
    // Priority is a flat add-on regardless of express/urgent for MVP
    return fee;
  }

  /**
   * Tax rate from platform settings (configurable)
   */
  private async getTaxRate(): Promise<number> {
    const serviceRole = await createServiceRoleClient();
    const { data } = await serviceRole
      .from('platform_settings')
      .select('value')
      .eq('key', 'tax_rate')
      .single();

    if (!data?.value) return 0.075; // Default 7.5% VAT

    return Number(data.value.rate || 0.075);
  }

  private async getQuoteLifetime(): Promise<number> {
    const serviceRole = await createServiceRoleClient();
    const { data } = await serviceRole
      .from('platform_settings')
      .select('value')
      .eq('key', 'quote_lifetime_seconds')
      .single();

    return data?.value?.seconds || 300; // Default 5 minutes
  }

  async getQuoteById(quoteId: string): Promise<DeliveryQuote | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('delivery_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}

export const quoteService = new QuoteService();
