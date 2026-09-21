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
  year,
}: {
  onClick: (lat: number, lng: number) => void;
  apiUrl: string;
  focus: { lat: number; lng: number } | null;
  year: number;
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

  // Mueve (o crea) el marcador de selección cuando cambia `focus` — cubre
  // tanto el clic real en el mapa (que ya lo hace directo en el propio
  // listener, esto solo repite lo mismo sin efecto visible) como saltar a
  // un hito relacionado desde el texto (ver onSaltarAHito en page.tsx),
  // que cambia `focus` sin pasar nunca por un clic real.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const lngLat: mapboxgl.LngLatLike = [focus.lng, focus.lat];
    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    } else {
      const el = document.createElement('div');
      el.className = 'h-4 w-4 rounded-full border-2 shadow-lg';
      el.style.backgroundColor = 'var(--color-seal)';
      el.style.borderColor = 'var(--color-paper)';
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);
    }
  }, [focus]);

  // `onClick` cambia de identidad en cada render de la página (p. ej. al
  // mover el slider de año), pero el mapa no debe recrearse por eso — solo
  // queremos que el listener de clic llame siempre a la versión más reciente.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // Igual que focusRef: para que style.load use el año actual al añadir las
  // capas de nombres históricos, sin que year forme parte de las
  // dependencias del efecto de inicialización del mapa.
  const yearRef = useRef(year);
  useEffect(() => {
    yearRef.current = year;
  }, [year]);

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
      // Sin carreteras/puentes/túneles (ni sus etiquetas), sin nombres
      // modernos de ciudades/pueblos/aeropuertos/transporte/POIs, y sin las
      // líneas de fronteras administrativas actuales (país/provincia) —
      // con las fronteras históricas de CHGIS puestas encima, las líneas
      // modernas mezclaban presente y pasado igual que pasaba con los
      // nombres. Se dejan los nombres de país/provincia y de accidentes
      // geográficos (ríos, desiertos): no cambian con el tiempo y ayudan a
      // orientarse aunque ya no se vea la raya.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (/^(road|bridge|tunnel|settlement|poi-label|airport-label|transit-label|admin-)/.test(layer.id)) {
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

      const filtroAño = (y: number) => ['all', ['<=', ['get', 'y0'], y], ['>=', ['get', 'y1'], y]];

      // Fronteras de prefectura históricas (CHGIS, ver
      // scripts/export-chgis-boundaries.mjs) — mismo patrón que los nombres
      // de más abajo (precargadas enteras, filtro por año actualizado en el
      // efecto de más abajo). Solo contorno, sin relleno, para no tapar el
      // satélite ni competir con las etiquetas de nombres, que van encima
      // (se añaden después). Cobertura real 1350-1911 con huecos antes; sin
      // datos ahí, sin más, igual que con los nombres.
      map.addSource('chgis-boundaries', { type: 'geojson', data: '/data/chgis-boundaries.geojson' });
      map.addLayer({
        id: 'chgis-boundaries-line',
        type: 'line',
        source: 'chgis-boundaries',
        filter: filtroAño(yearRef.current) as any,
        paint: { 'line-color': '#e9e7e2', 'line-width': 1, 'line-opacity': 0.55 },
      });

      // Nombres históricos reales de ciudades/condados (CHGIS, ver
      // scripts/export-chgis-geojson.mjs) — precargados enteros, sin
      // llamadas de red por interacción. y0/y1 son el rango de años en que
      // ese nombre estuvo vigente; el efecto de más abajo actualiza el
      // filtro cada vez que cambia el año del slider. Se añaden después de
      // la máscara para quedar por encima del oscurecido. Condados
      // (~10.500) solo a partir de cierto zoom para no saturar el mapa;
      // prefecturas siempre visibles. Mapbox ya evita solapes de texto por
      // defecto (text-allow-overlap: false).
      map.addSource('chgis', { type: 'geojson', data: '/data/chgis-settlements.geojson' });
      // Chino arriba, pinyin debajo más pequeño, en la misma etiqueta — ver
      // https://docs.mapbox.com/style-spec/reference/expressions/#format.
      const textoChinoYPinyin = ['format', ['get', 'name'], {}, '\n', {}, ['get', 'py'], { 'font-scale': 0.72 }];
      map.addLayer({
        id: 'chgis-prefecture-labels',
        type: 'symbol',
        source: 'chgis',
        filter: ['all', ['==', ['get', 'level'], 'prefecture'], filtroAño(yearRef.current)] as any,
        // Sin text-font explícito: hereda el stack por defecto de la capa
        // simbólica del estilo, que ya renderiza los nombres chinos
        // modernos que deja visibles style.load — un valor inventado aquí
        // podría no existir en los glifos del estilo y dejar el texto en
        // blanco sin avisar.
        layout: { 'text-field': textoChinoYPinyin as any, 'text-size': 13, 'text-line-height': 1.1 },
        paint: { 'text-color': '#e9e7e2', 'text-halo-color': '#1d1b19', 'text-halo-width': 1.2 },
      });
      map.addLayer({
        id: 'chgis-county-labels',
        type: 'symbol',
        source: 'chgis',
        minzoom: 6,
        filter: ['all', ['==', ['get', 'level'], 'county'], filtroAño(yearRef.current)] as any,
        layout: { 'text-field': textoChinoYPinyin as any, 'text-size': 11, 'text-line-height': 1.1 },
        paint: { 'text-color': '#e9e7e2', 'text-halo-color': '#1d1b19', 'text-halo-width': 1 },
      });

      // Puntos de hito extraídos del libro (ver
      // china-history-api/scripts/extract-hitos.mjs +
      // scripts/export-hitos-geojson.mjs) — de antemano, antes de hacer
      // clic, para que el usuario sepa dónde el libro documenta algo. y0/y1
      // ya vienen con la tolerancia de año aplicada (±25 años). El clic
      // "engancha" al punto más cercano en píxeles si hay uno cerca — ver
      // map.on('click') más abajo.
      map.addSource('hitos', { type: 'geojson', data: '/data/hitos.geojson' });
      map.addLayer({
        id: 'hitos-circle',
        type: 'circle',
        source: 'hitos',
        filter: filtroAño(yearRef.current) as any,
        paint: {
          'circle-radius': 5,
          'circle-color': '#d4a24c',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#1d1b19',
        },
      });
    });

    map.on('click', (e) => {
      if (!isInsideChina(e.lngLat.lat, e.lngLat.lng)) return; // fuera de China: no se puede tocar

      // El backend acepta un hito conocido hasta 50km del punto pulsado,
      // pero a mucho zoom-out cada píxel de pantalla son decenas de km — un
      // clic que cae visualmente justo sobre el punto puede traducirse en
      // coordenadas reales muy lejos de él. Para que el punto se pueda
      // tocar igual de fácil a cualquier zoom, si hay un punto de hito a
      // pocos píxeles del clic se usan sus coordenadas exactas en vez de
      // las del clic — el criterio pasa a ser "distancia en pantalla", que
      // no depende del zoom. El radio se queda cerca del tamaño visual del
      // punto (circle-radius 5 + stroke 1.5 ≈ 6-7px): más grande que eso
      // "engancha" clics que visualmente caen claramente fuera del punto
      // (p. ej. al pulsar cerca de un hito justo después de saltar ahí,
      // cuando el mapa se recentra encima suyo).
      const RADIO_ENGANCHE_PX = 9;
      const cercanos = map.queryRenderedFeatures(
        [
          [e.point.x - RADIO_ENGANCHE_PX, e.point.y - RADIO_ENGANCHE_PX],
          [e.point.x + RADIO_ENGANCHE_PX, e.point.y + RADIO_ENGANCHE_PX],
        ],
        { layers: ['hitos-circle'] },
      );
      let lngLat = e.lngLat;
      if (cercanos.length > 0) {
        let masCercano = cercanos[0];
        let distanciaMin = Infinity;
        for (const f of cercanos) {
          const coords = (f as any).geometry.coordinates as [number, number];
          const punto = map.project(coords);
          const distancia = Math.hypot(punto.x - e.point.x, punto.y - e.point.y);
          if (distancia < distanciaMin) {
            distanciaMin = distancia;
            masCercano = f;
          }
        }
        const [lng, lat] = (masCercano as any).geometry.coordinates as [number, number];
        lngLat = { lng, lat } as mapboxgl.LngLat;
      }

      // El marcador se coloca/mueve solo, vía el efecto que escucha `focus`
      // más arriba — onClick (page.tsx) actualiza `focus` con estas mismas
      // coordenadas, ya ancladas al punto si correspondía.
      onClickRef.current(lngLat.lat, lngLat.lng);
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

  // Actualiza qué nombres históricos se ven cada vez que se mueve el slider
  // de año — sin llamada de red, solo recalcula el filtro sobre los datos
  // ya cargados. Guardado por si corre antes de que style.load haya añadido
  // las capas (p. ej. justo al montar).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('chgis-prefecture-labels')) return;
    const filtroAño = ['all', ['<=', ['get', 'y0'], year], ['>=', ['get', 'y1'], year]];
    map.setFilter('chgis-prefecture-labels', ['all', ['==', ['get', 'level'], 'prefecture'], filtroAño] as any);
    map.setFilter('chgis-county-labels', ['all', ['==', ['get', 'level'], 'county'], filtroAño] as any);
    map.setFilter('chgis-boundaries-line', filtroAño as any);
    if (map.getLayer('hitos-circle')) map.setFilter('hitos-circle', filtroAño as any);
  }, [year]);

  return <div ref={mapContainer} className="absolute inset-0 h-full w-full" />;
}