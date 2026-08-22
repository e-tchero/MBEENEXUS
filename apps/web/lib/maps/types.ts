export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
  components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
}

export interface RouteResult {
  distance_km: number;
  duration_minutes: number;
  polyline?: string;
}

export interface MapsProvider {
  geocode(address: string): Promise<GeocodingResult[]>;
  reverseGeocode(lat: number, lon: number): Promise<GeocodingResult>;
  searchAddresses(
    query: string,
    location?: { lat: number; lon: number }
  ): Promise<GeocodingResult[]>;
  getRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number }
  ): Promise<RouteResult>;
}
