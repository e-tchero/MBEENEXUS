import type { MapsProvider, GeocodingResult, RouteResult } from './types';

/**
 * Stadia Maps Provider — Embee Nexus
 *
 * Credit costs (verified from stadiamaps.com/pricing):
 * - Autocomplete Search v2: 1 credit/request
 * - Forward Geocoding: 20 credits/request
 * - Reverse Geocoding: 20 credits/request
 * - Standard Routing: 20 credits/request
 *
 * Plan: Starter ($20/month, 1M credits)
 *
 * Authentication: API key via query string or Authorization header.
 * For server-side use, the API key is passed as a query parameter.
 *
 * Attribution: https://stadiamaps.com/attribution
 * Must be displayed when using Stadia Maps tiles or APIs.
 */
export class StadiaMapsProvider implements MapsProvider {
  private apiKey: string;
  private geocodingBaseUrl = 'https://api.stadiamaps.com/geocoding/v2';
  private routingBaseUrl = 'https://api.stadiamaps.com/route/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Forward geocoding — convert address string to coordinates.
   * Uses Stadia Maps Geocoding v2 forward endpoint.
   * Credit cost: 20 credits/request.
   */
  async geocode(address: string): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      text: address,
      'boundary.country': 'NG',
      size: '5',
      api_key: this.apiKey,
    });

    const url = `${this.geocodingBaseUrl}/forward?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Stadia Maps geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Geocoding returned no results');
    }

    return data.features.map((feature: StadiaFeature) => ({
      address: feature.properties?.label || feature.properties?.name || '',
      latitude: feature.geometry?.coordinates?.[1] ?? 0,
      longitude: feature.geometry?.coordinates?.[0] ?? 0,
      formatted_address: feature.properties?.label || feature.properties?.name || '',
      components: this.parseProperties(feature.properties),
    }));
  }

  /**
   * Reverse geocoding — convert coordinates to address.
   * Uses Stadia Maps Geocoding v2 reverse endpoint.
   * Credit cost: 20 credits/request.
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
    const params = new URLSearchParams({
      'point.lat': String(lat),
      'point.lon': String(lon),
      size: '1',
      api_key: this.apiKey,
    });

    const url = `${this.geocodingBaseUrl}/reverse?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Stadia Maps reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Reverse geocoding returned no results');
    }

    const feature = data.features[0];
    return {
      address: feature.properties?.label || feature.properties?.name || '',
      latitude: feature.geometry?.coordinates?.[1] ?? lat,
      longitude: feature.geometry?.coordinates?.[0] ?? lon,
      formatted_address: feature.properties?.label || feature.properties?.name || '',
      components: this.parseProperties(feature.properties),
    };
  }

  /**
   * Address search — convert query string to candidate addresses.
   * Uses Stadia Maps Geocoding v2 forward endpoint (not autocomplete).
   * For actual autocomplete (search-as-you-type), use the autocomplete method.
   * Credit cost: 20 credits/request.
   */
  async searchAddresses(
    query: string,
    location?: { lat: number; lon: number }
  ): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      text: query,
      'boundary.country': 'NG',
      size: '5',
      api_key: this.apiKey,
    });

    if (location) {
      params.set('focus.point.lat', String(location.lat));
      params.set('focus.point.lon', String(location.lon));
    }

    const url = `${this.geocodingBaseUrl}/forward?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Stadia Maps search failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features) return [];

    return data.features.map((feature: StadiaFeature) => ({
      address: feature.properties?.label || feature.properties?.name || '',
      latitude: feature.geometry?.coordinates?.[1] ?? 0,
      longitude: feature.geometry?.coordinates?.[0] ?? 0,
      formatted_address: feature.properties?.label || feature.properties?.name || '',
      components: this.parseProperties(feature.properties),
    }));
  }

  /**
   * Autocomplete search — search-as-you-type for address input.
   * Uses Stadia Maps Geocoding v2 autocomplete endpoint.
   * Credit cost: 1 credit/request.
   *
   * This is the cost-optimized endpoint for address search UIs.
   * Use this for typing-phase queries; use forward geocoding for
   * final selection confirmation.
   */
  async autocomplete(
    query: string,
    location?: { lat: number; lon: number }
  ): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      text: query,
      'boundary.country': 'NG',
      size: '5',
      api_key: this.apiKey,
    });

    if (location) {
      params.set('focus.point.lat', String(location.lat));
      params.set('focus.point.lon', String(location.lon));
    }

    const url = `${this.geocodingBaseUrl}/autocomplete?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Stadia Maps autocomplete failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features) return [];

    return data.features.map((feature: StadiaFeature) => ({
      address: feature.properties?.label || feature.properties?.name || '',
      latitude: feature.geometry?.coordinates?.[1] ?? 0,
      longitude: feature.geometry?.coordinates?.[0] ?? 0,
      formatted_address: feature.properties?.label || feature.properties?.name || '',
      components: this.parseProperties(feature.properties),
    }));
  }

  /**
   * Route calculation — get distance, duration, and polyline between two points.
   * Uses Stadia Maps Standard Routing endpoint.
   * Credit cost: 20 credits/request.
   *
   * Returns normalized routing facts (distance_km, duration_minutes, polyline).
   * The Embee Nexus pricing engine (QuoteService) consumes these facts
   * to calculate customer price. This provider does NOT determine pricing.
   */
  async getRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number }
  ): Promise<RouteResult> {
    const body = {
      locations: [
        { lat: origin.lat, lon: origin.lon, type: 'break' },
        { lat: destination.lat, lon: destination.lon, type: 'break' },
      ],
      costing: 'auto',
      units: 'km',
    };

    const url = `${this.routingBaseUrl}?api_key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Stadia Maps routing failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
      throw new Error('Routing failed: no route found');
    }

    const summary = data.trip.summary;
    const shape = data.trip.legs[0]?.shape || '';

    return {
      distance_km: Math.round((summary.length || 0) * 10) / 10,
      duration_minutes: Math.ceil((summary.time || 0) / 60),
      polyline: shape,
      coordinates: shape ? decodeValhallaPolyline(shape) : undefined,
    };
  }

  /**
   * Parse Stadia Maps feature properties into GeocodingResult components.
   */
  private parseProperties(
    props: Record<string, unknown> | undefined
  ): GeocodingResult['components'] {
    if (!props) return {};

    return {
      street: (props.street as string) || undefined,
      city: (props.locality as string) || (props.neighbourhood as string) || undefined,
      state: (props.region as string) || undefined,
      country: (props.country as string) || undefined,
      postal_code: (props.postalcode as string) || undefined,
    };
  }
}

/**
 * Decode a Valhalla-encoded polyline string into [lng, lat] coordinates.
 * Valhalla uses a 1e-6 precision encoding similar to Google's but with
 * a different sign/bits scheme.
 *
 * @see https://github.com/valhalla/valhalla/blob/master/valhalla/midgard/encodedpolyline.h
 */
function decodeValhallaPolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / 1e6, lat / 1e6]);
  }

  return coords;
}

/**
 * Stadia Maps GeoJSON feature type.
 */
interface StadiaFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}
