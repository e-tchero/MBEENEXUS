import type { MapsProvider } from './types';
import { MapboxProvider } from './mapbox';
import { GoogleMapsProvider } from './google-maps';

let provider: MapsProvider | null = null;

/**
 * Maps provider factory for MBEENEXUS.
 *
 * MVP: Mapbox (free tier — 100K directions/mo, 50K map loads/mo)
 * Future: Google Maps when MBEENEXUS scales and can afford paid APIs.
 *
 * The provider is abstracted behind the MapsProvider interface.
 * Switching providers requires only changing this factory —
 * no business logic changes needed.
 *
 * Both Mapbox and Google Maps are supported simultaneously.
 * Provider selection is controlled by the MAPS_PROVIDER env var.
 *
 * Environment variables:
 * - MAPS_PROVIDER: "mapbox" (default) or "google"
 * - MAPBOX_ACCESS_TOKEN: Required when using Mapbox
 * - GOOGLE_MAPS_API_KEY: Required when using Google Maps
 */
export function getMapsProvider(): MapsProvider {
  if (!provider) {
    const providerType = process.env.MAPS_PROVIDER || 'mapbox';

    if (providerType === 'google') {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GOOGLE_MAPS_API_KEY environment variable is required for Google Maps provider.'
        );
      }
      provider = new GoogleMapsProvider(apiKey);
    } else {
      // Default: Mapbox (MVP)
      const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error(
          'MAPBOX_ACCESS_TOKEN environment variable is required for Mapbox provider.'
        );
      }
      provider = new MapboxProvider(accessToken);
    }
  }
  return provider;
}

/**
 * Reset the provider singleton (useful for testing).
 */
export function resetMapsProvider(): void {
  provider = null;
}

export type { MapsProvider, GeocodingResult, RouteResult } from './types';
