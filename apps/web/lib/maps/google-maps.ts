import type { MapsProvider, GeocodingResult, RouteResult } from './types';

export class GoogleMapsProvider implements MapsProvider {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async geocode(address: string): Promise<GeocodingResult[]> {
    const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    return data.results.map((result: GoogleGeocodingResult) =>
      this.mapGeocodingResult(result)
    );
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
    const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lon}&key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results.length) {
      throw new Error(`Reverse geocoding failed: ${data.status}`);
    }

    return this.mapGeocodingResult(data.results[0]);
  }

  async searchAddresses(
    query: string,
    location?: { lat: number; lon: number }
  ): Promise<GeocodingResult[]> {
    let url = `${this.baseUrl}/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:ng&key=${this.apiKey}`;

    if (location) {
      url += `&location=${location.lat},${location.lon}&radius=50000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return [];
    }

    // Get details for each prediction
    const results: GeocodingResult[] = [];
    for (const prediction of data.predictions.slice(0, 5)) {
      try {
        const details = await this.getPlaceDetails(prediction.place_id);
        results.push(details);
      } catch {
        // Skip failed place details
      }
    }

    return results;
  }

  async getRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number }
  ): Promise<RouteResult> {
    const url = `${this.baseUrl}/directions/json?origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&mode=driving&key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes.length) {
      throw new Error(`Routing failed: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      distance_km: leg.distance.value / 1000,
      duration_minutes: Math.ceil(leg.duration.value / 60),
      polyline: route.overview_polyline.points,
    };
  }

  private async getPlaceDetails(placeId: string): Promise<GeocodingResult> {
    const url = `${this.baseUrl}/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,address_components&key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Place details failed: ${data.status}`);
    }

    return this.mapGeocodingResult({
      formatted_address: data.result.formatted_address,
      geometry: data.result.geometry,
      address_components: data.result.address_components,
    });
  }

  private mapGeocodingResult(result: GoogleGeocodingResult): GeocodingResult {
    const components: GeocodingResult['components'] = {};

    for (const component of result.address_components || []) {
      const types = component.types;
      if (types.includes('street_number') || types.includes('route')) {
        components.street = component.long_name;
      }
      if (types.includes('locality')) {
        components.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        components.state = component.long_name;
      }
      if (types.includes('country')) {
        components.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        components.postal_code = component.long_name;
      }
    }

    return {
      address: result.formatted_address || '',
      latitude: result.geometry?.location?.lat || 0,
      longitude: result.geometry?.location?.lng || 0,
      formatted_address: result.formatted_address || '',
      components,
    };
  }
}

interface GoogleGeocodingResult {
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
