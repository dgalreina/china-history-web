'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CHINA_BOUNDS, CHINA_MASK_GEOJSON, isInsideChina } from '../lib/chinaBoundary';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function MapView({
  onClick,
  apiUrl,
  focus,
}: {
  onClick: (lat: number, lng: number) => void;
  apiUrl: string;
  focus: { lat: number; lng: number } | null;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // El contenedor cambia de tamaño cuando aparece el panel de la imagen
  // (pantalla completa → media pantalla). Mapbox solo reacciona al resize de
  // la ventana, no del contenedor, así que se lo avisamos; y como al
  // redimensionar ancla la esquina superior (el centro se desplaza), después
  // se vuelve a centrar en el punto pulsado.
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);
  useEffect(() => {
    const el = mapContainer.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      const f = focusRef.current;
      if (f) map.jumpTo({ center: [f.lng, f.lat] });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!focus) return;
    mapRef.current?.easeTo({ center: [focus.lng, focus.lat], duration: 600 });
  }, [focus]);

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
      center: [103.8, 32], // más centrado en China que Beijing, para el encuadre inicial
      // Al abrir, se ve China entera de un vistazo — con maxBounds fijo,
      // Mapbox no deja bajar de un zoom mínimo según el tamaño del
      // contenedor (media pantalla), así que cualquier valor por debajo
      // de ese límite da el mismo resultado; 2.2 ya lo alcanza.
      zoom: 2.2,
      maxZoom: 11, // ya sin carreteras/nombres modernos visibles (ver style.load), se puede acercar más
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
    map.on('load', () => {
      // Aviso propio (no del proveedor) de que el mapa se ha cargado, para
      // el panel de consumo — ver UsagePanel.tsx.
      fetch(`${apiUrl}/usage/map-load`, { method: 'POST' }).catch(() => {});
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [apiUrl]);

  return <div ref={mapContainer} className="absolute inset-0 h-full w-full" />;
}