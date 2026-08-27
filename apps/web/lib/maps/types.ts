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
  /** Decoded route coordinates [lng, lat][] for map rendering */
  coordinates?: [number, number][];
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
  /** Optional: search-as-you-type address autocomplete. Cost-optimized (1 credit vs 20 for geocoding). */
  autocomplete?(
    query: string,
    location?: { lat: number; lon: number }
  ): Promise<GeocodingResult[]>;
}
