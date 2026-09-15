'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CHINA_BOUNDS, CHINA_MASK_GEOJSON, isInsideChina } from '../lib/chinaBoundary';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function MapView({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // `onClick` cambia de identidad en cada render de la página (p. ej. al
  // mover el slider de año), pero el mapa no debe recrearse por eso — solo
  // queremos que el listener de clic llame siempre a la versión más reciente.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (mapRef.current) return; // evita reinicializar en re-render

    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [116.4, 39.9], // Beijing
      zoom: 4,
      maxZoom: 8, // evita acercarse tanto como para reconocer ciudades/carreteras modernas
      maxBounds: CHINA_BOUNDS, // no se puede arrastrar el mapa fuera de China
    });

    map.on('style.load', () => {
      // Queremos nombres de ciudades/pueblos pero sin el ruido visual de
      // carreteras, puentes y túneles (ni sus etiquetas de nombre/número).
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (/^(road|bridge|tunnel)/.test(layer.id)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }

      // Oscurece todo lo que no sea China (relleno del mundo con un
      // agujero recortado al contorno real de China + Hainan).
      map.addSource('china-mask', { type: 'geojson', data: CHINA_MASK_GEOJSON as any });
      map.addLayer({
        id: 'china-mask-fill',
        type: 'fill',
        source: 'china-mask',
        paint: { 'fill-color': '#000000', 'fill-opacity': 0.65 },
      });
    });

    map.on('click', (e) => {
      if (!isInsideChina(e.lngLat.lat, e.lngLat.lng)) return; // fuera de China: no se puede tocar

      onClickRef.current(e.lngLat.lat, e.lngLat.lng);

      if (markerRef.current) {
        markerRef.current.setLngLat(e.lngLat);
      } else {
        const el = document.createElement('div');
        el.className = 'h-4 w-4 rounded-full border-2 shadow-lg';
        el.style.backgroundColor = 'var(--color-seal)';
        el.style.borderColor = 'var(--color-paper)';
        markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(e.lngLat)
          .addTo(map);
      }
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainer} className="absolute inset-0 h-full w-full" />;
}