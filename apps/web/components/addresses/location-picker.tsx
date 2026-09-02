'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  className,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;

    import('maplibre-gl').then((maplibregl) => {
      if (cancelled || !mapContainer.current) return;

      const mgl = maplibregl;

      const styleUrl = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';

      const map = new mgl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [longitude, latitude],
        zoom: 15,
      });

      map.addControl(new mgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (cancelled) return;

        // Create draggable marker
        const el = document.createElement('div');
        el.style.cssText = 'width:24px;height:24px;background:#147BFF;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:grab;';

        const marker = new mgl.Marker({ element: el, draggable: true })
          .setLngLat([longitude, latitude])
          .addTo(map);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onLocationChange(lngLat.lat, lngLat.lng);
        });

        markerRef.current = marker;
        mapRef.current = map;
        setMapLoaded(true);
      });

      map.on('error', () => {
        if (!cancelled) setMapError(true);
      });

      // Click on map to move marker
      map.on('click', (e: { lngLat: { lat: number; lng: number } }) => {
        if (markerRef.current) {
          markerRef.current.setLngLat(e.lngLat);
          onLocationChange(e.lngLat.lat, e.lngLat.lng);
        }
      });
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker position when props change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    }
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15 });
    }
  }, [latitude, longitude]);

  if (mapError) {
    return (
      <div className={cn('w-full h-64 bg-embee-white rounded-lg flex items-center justify-center', className)}>
        <div className="text-center text-embee-slate">
          <p className="text-sm font-medium">Map unavailable</p>
          <p className="text-xs mt-1">Check mapping configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-64 sm:h-80 rounded-lg overflow-hidden', className)}>
      <div ref={mapContainer} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-embee-white flex items-center justify-center">
          <div className="text-embee-slate text-sm">Loading map...</div>
        </div>
      )}
      {/* Attribution */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 text-[10px] text-embee-slate px-2 py-1 text-center">
        © <a href="https://stadiamaps.com/" target="_blank" rel="noopener noreferrer" className="underline">Stadia Maps</a>, © <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer" className="underline">OpenMapTiles</a>, © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors
      </div>
      {/* Pin indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-6 h-6 bg-embee-blue rounded-full border-2 border-white shadow-lg" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-embee-blue mx-auto -mt-0.5" />
      </div>
      {/* Instructions */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 text-xs text-embee-charcoal px-3 py-1 rounded-full shadow-sm">
        Drag pin or tap map to adjust location
      </div>
    </div>
  );
}
