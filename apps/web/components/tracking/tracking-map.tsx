'use client';

import { useEffect, useRef, useState } from 'react';

interface TrackingMapProps {
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  riderLat?: number | null;
  riderLng?: number | null;
  riderHeading?: number | null;
  status: string;
}

const TRACKING_STATUSES = [
  'rider_assigned', 'rider_en_route_to_pickup', 'arrived_at_pickup',
  'picked_up', 'in_transit', 'arrived_at_destination',
];

export function TrackingMap({
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  riderLat,
  riderLng,
  riderHeading,
  status,
}: TrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const showRider = TRACKING_STATUSES.includes(status) && riderLat != null && riderLng != null;

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setMapError(true);
      return;
    }

    let cancelled = false;

    import('mapbox-gl').then((mapboxgl) => {
      if (cancelled || !mapContainer.current) return;

      mapboxgl.default.accessToken = token;

      const map = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [pickupLng, pickupLat],
        zoom: 13,
      });

      map.addControl(new mapboxgl.default.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (cancelled) return;

        // Pickup marker (green)
        new mapboxgl.default.Marker({ color: '#22c55e' })
          .setLngLat([pickupLng, pickupLat])
          .setPopup(new mapboxgl.default.Popup().setText('Pickup'))
          .addTo(map);

        // Destination marker (red)
        new mapboxgl.default.Marker({ color: '#ef4444' })
          .setLngLat([destinationLng, destinationLat])
          .setPopup(new mapboxgl.default.Popup().setText('Destination'))
          .addTo(map);

        // Route line
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [pickupLng, pickupLat],
                [destinationLng, destinationLat],
              ],
            },
            properties: {},
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#6366f1',
            'line-width': 3,
            'line-opacity': 0.6,
          },
        });

        // Fit bounds to show both points
        const bounds = new mapboxgl.default.LngLatBounds();
        bounds.extend([pickupLng, pickupLat]);
        bounds.extend([destinationLng, destinationLat]);
        if (showRider && riderLat && riderLng) {
          bounds.extend([riderLng, riderLat]);
        }
        map.fitBounds(bounds, { padding: 50 });

        // Rider marker (blue, dynamic)
        if (showRider && riderLat && riderLng) {
          const el = document.createElement('div');
          el.className = 'rider-marker';
          el.style.cssText = 'width:32px;height:32px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
          el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

          riderMarkerRef.current = new mapboxgl.default.Marker({ element: el })
            .setLngLat([riderLng, riderLat])
            .setPopup(new mapboxgl.default.Popup().setText('Rider'))
            .addTo(map);
        }

        mapRef.current = map;
        setMapLoaded(true);
      });

      map.on('error', () => {
        if (!cancelled) setMapError(true);
      });
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [pickupLat, pickupLng, destinationLat, destinationLng]);

  // Update rider marker position when props change
  useEffect(() => {
    if (riderMarkerRef.current && riderLat != null && riderLng != null) {
      riderMarkerRef.current.setLngLat([riderLng, riderLat]);
    }
  }, [riderLat, riderLng, riderHeading]);

  if (mapError) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-sm font-medium">Map unavailable</p>
          <p className="text-xs mt-1">Check NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading map...</div>
        </div>
      )}
    </div>
  );
}
