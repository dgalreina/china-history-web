'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function MapView({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapRef.current) return; // evita reinicializar en re-render

    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [116.4, 39.9], // Beijing
      zoom: 4,
      maxZoom: 8, // evita acercarse tanto como para reconocer ciudades/carreteras modernas
    });

    map.on('click', (e) => onClick(e.lngLat.lat, e.lngLat.lng));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onClick]);

  return <div ref={mapContainer} className="absolute inset-0 h-full w-full" />;
}