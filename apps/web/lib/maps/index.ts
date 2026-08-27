import type { MapsProvider } from './types';
import { StadiaMapsProvider } from './stadia';
import { MapboxProvider } from './mapbox';
import { GoogleMapsProvider } from './google-maps';

let provider: MapsProvider | null = null;

/**
 * Maps provider factory for Embee Nexus.
 *
 * Provider selection is controlled by the MAPS_PROVIDER env var.
 * Default: "stadia" (Stadia Maps — tiles, geocoding, routing)
 *
 * Supported providers:
 * - "stadia": Stadia Maps (recommended — Starter plan, $20/month)
 * - "mapbox": Mapbox (legacy — requires MAPBOX_ACCESS_TOKEN)
 * - "google": Google Maps (future — requires GOOGLE_MAPS_API_KEY)
 *
 * The provider is abstracted behind the MapsProvider interface.
 * Switching providers requires only changing this factory —
 * no business logic changes needed.
 *
 * Environment variables:
 * - MAPS_PROVIDER: "stadia" (default), "mapbox", or "google"
 * - STADIA_MAPS_API_KEY: Required when using Stadia Maps
 * - MAPBOX_ACCESS_TOKEN: Required when using Mapbox
 * - GOOGLE_MAPS_API_KEY: Required when using Google Maps
 */
export function getMapsProvider(): MapsProvider {
  if (!provider) {
    const providerType = process.env.MAPS_PROVIDER || 'stadia';

    if (providerType === 'stadia') {
      const apiKey = process.env.STADIA_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error(
          'STADIA_MAPS_API_KEY environment variable is required for Stadia Maps provider.'
        );
      }
      provider = new StadiaMapsProvider(apiKey);
    } else if (providerType === 'google') {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GOOGLE_MAPS_API_KEY environment variable is required for Google Maps provider.'
        );
      }
      provider = new GoogleMapsProvider(apiKey);
    } else {
      // Legacy: Mapbox
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
