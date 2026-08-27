import type { MapsProvider, GeocodingResult, RouteResult } from './types';

/**
 * Mapbox Maps Provider — Embee Nexus (legacy)
 *
 * Free tier limits:
 * - Directions API: 100,000 requests/month
 * - Mapbox GL JS: 50,000 map loads/month
 * - Map Matching: 100,000 requests/month
 * - Geocoding: 100,000 requests/month
 *
 * When Embee Nexus scales, this can be swapped for Google Maps
 * without changing any business logic (provider abstraction).
 */
export class MapboxProvider implements MapsProvider {
  private accessToken: string;
  private baseUrl = 'https://api.mapbox.com';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async geocode(address: string): Promise<GeocodingResult[]> {
    const encoded = encodeURIComponent(address);
    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encoded}.json?access_token=${this.accessToken}&country=ng&limit=5`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Geocoding returned no results');
    }

    return data.features.map((feature: MapboxFeature) => ({
      address: feature.place_name || '',
      latitude: feature.center[1],
      longitude: feature.center[0],
      formatted_address: feature.place_name || '',
      components: this.parseContext(feature.context || []),
    }));
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${this.accessToken}&country=ng`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Reverse geocoding returned no results');
    }

    const feature = data.features[0];
    return {
      address: feature.place_name || '',
      latitude: feature.center[1],
      longitude: feature.center[0],
      formatted_address: feature.place_name || '',
      components: this.parseContext(feature.context || []),
    };
  }

  async searchAddresses(
    query: string,
    location?: { lat: number; lon: number }
  ): Promise<GeocodingResult[]> {
    let url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.accessToken}&country=ng&types=address,place&limit=5`;

    if (location) {
      url += `&proximity=${location.lon},${location.lat}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!data.features) return [];

    return data.features.map((feature: MapboxFeature) => ({
      address: feature.place_name || '',
      latitude: feature.center[1],
      longitude: feature.center[0],
      formatted_address: feature.place_name || '',
      components: this.parseContext(feature.context || []),
    }));
  }

  async getRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number }
  ): Promise<RouteResult> {
    // Mapbox Directions API: profile=driving, steps=false for simple distance/duration
    const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = `${this.baseUrl}/directions/v5/mapbox/driving/${coordinates}?access_token=${this.accessToken}&geometries=overviewpolyline&overview=full`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('Routing failed: no route found');
    }

    const route = data.routes[0];

    return {
      distance_km: Math.round((route.distance / 1000) * 10) / 10,
      duration_minutes: Math.ceil(route.duration / 60),
      polyline: route.geometry,
    };
  }

  private parseContext(context: MapboxContext[]): GeocodingResult['components'] {
    const components: GeocodingResult['components'] = {};

    for (const item of context) {
      if (item.id?.startsWith('neighborhood') || item.id?.startsWith('place')) {
        components.city = components.city || item.text;
      }
      if (item.id?.startsWith('region')) {
        components.state = components.state || item.text;
      }
      if (item.id?.startsWith('country')) {
        components.country = components.country || item.text;
      }
      if (item.id?.startsWith('postcode')) {
        components.postal_code = item.text;
      }
    }

    return components;
  }
}

interface MapboxFeature {
  id: string;
  type: string;
  place_name: string;
  center: [number, number];
  context: MapboxContext[];
}

interface MapboxContext {
  id: string;
  text: string;
}
