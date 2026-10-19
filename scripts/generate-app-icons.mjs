// Genera los iconos de la app (icon.png, apple-icon.png, icon-192/512,
// icon-maskable-512) a partir del mismo path vectorial del ding que usa
// VasijaSpinner.tsx (app/components/VasijaSpinner.tsx), relleno en blanco
// sobre un fondo degradado en el verde de marca (--color-seal, globals.css).
// Uso: node scripts/generate-app-icons.mjs
import sharp from 'sharp';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Mismo contorno que VasijaSpinner.tsx (viewBox 0 0 512 512) — silueta
// exterior del ding trazada a mano a partir de public/icons/icon-512.png.
const CONTORNO =
  'M 67.500 22.494 C 66.950 22.679, 62 23.604, 56.500 24.549 C 47.550 26.087, 46.173 26.612, 43.389 29.557 C 41.123 31.954, 40.053 34.294, 39.448 38.174 C 38.333 45.332, 38.539 46.605, 42.454 56.746 C 45.325 64.182, 46.076 67.984, 47.444 82 C 50.257 110.822, 53.940 140.019, 55.017 142.031 C 55.589 143.101, 57.057 144.163, 58.279 144.392 C 67.003 146.025, 68.521 146.633, 69.782 149 C 72.261 153.656, 69.903 170.822, 63.532 194.500 C 59.310 210.192, 57.943 219.313, 57.315 236 C 56.880 247.551, 57.159 254.851, 58.412 264.653 C 61.703 290.414, 67.377 305.666, 77.968 317.224 L 84.010 323.817 83.243 329.159 C 82.506 334.300, 82.348 334.519, 79.015 335 C 76.729 335.330, 75.170 336.270, 74.425 337.768 C 71.381 343.890, 72.079 379.403, 75.511 393 C 76.413 396.575, 77.584 401.184, 78.112 403.243 C 78.766 405.788, 79.978 407.454, 81.898 408.447 C 83.961 409.514, 84.883 410.889, 85.313 413.543 C 86.222 419.144, 84.224 449.810, 81.880 466.239 C 80.724 474.345, 80.048 482.057, 80.380 483.376 C 81.156 486.471, 86.119 488.469, 96.962 490.055 C 112.684 492.354, 142.266 489.676, 148.857 485.358 C 151.104 483.886, 151.214 483.391, 150.576 477.642 C 150.200 474.264, 149.687 459.575, 149.434 445 C 148.946 416.754, 149.220 413.682, 154.474 388.500 C 155.851 381.900, 157.269 372.657, 157.624 367.960 C 158.205 360.277, 158.591 359.038, 161.478 355.600 L 164.686 351.778 176.593 353.365 C 191.953 355.411, 210.572 356.977, 219.715 356.990 C 225.848 356.998, 227.087 357.293, 227.977 358.958 C 231.138 364.863, 232.506 417.716, 229.998 437.013 C 228.920 445.309, 228.971 446.311, 230.565 448.072 C 233.462 451.273, 239.689 452.386, 255 452.441 C 269.726 452.494, 278.830 451.115, 280.998 448.502 C 281.798 447.539, 281.654 441.208, 280.469 425.182 C 278.868 403.533, 278.902 398.889, 280.826 376 C 281.948 362.651, 282.848 357.975, 284.392 357.456 C 285.001 357.251, 292.475 356.601, 301 356.011 C 309.525 355.422, 322.350 354.213, 329.500 353.324 C 336.650 352.436, 343.351 351.662, 344.392 351.604 C 345.550 351.540, 347.560 353.245, 349.575 356 C 352.313 359.743, 352.880 361.425, 352.942 366 C 352.984 369.025, 354.384 378.025, 356.054 386 C 361.457 411.800, 361.990 416.874, 361.930 442 C 361.899 454.925, 361.494 469.325, 361.029 474 C 360.236 481.966, 360.319 482.638, 362.342 484.689 C 366.037 488.436, 378.855 490.489, 398.500 490.479 C 416.802 490.470, 426.614 488.800, 430.381 485.053 C 432.223 483.221, 432.217 482.849, 430.079 467.382 C 428.877 458.692, 427.481 443.464, 426.976 433.541 C 425.683 408.158, 425.538 410.057, 428.862 408.898 C 432.488 407.634, 433.438 405.482, 436.211 392.248 C 438.132 383.080, 438.466 378.392, 438.482 360.355 C 438.498 341.153, 438.330 339.021, 436.646 337.161 C 435.626 336.035, 433.650 334.975, 432.254 334.806 C 430.101 334.546, 429.510 333.694, 428.362 329.185 L 427.008 323.870 433.548 317.266 C 441.573 309.161, 445.972 300.486, 449.422 285.960 C 453.184 270.118, 454.333 260.030, 454.312 243 C 454.289 224.097, 453.203 216.221, 447.537 193.855 C 440.205 164.915, 438.603 151.593, 441.967 147.540 C 442.651 146.715, 445.439 145.745, 448.163 145.384 C 450.887 145.023, 453.949 144.001, 454.968 143.114 C 456.910 141.423, 456.846 141.874, 463.494 83.178 C 465.675 63.925, 466.229 61.161, 469.205 54.695 C 474.456 43.283, 473.247 33.164, 466 27.889 C 464.503 26.800, 458.885 25.296, 452 24.142 C 438.752 21.921, 437.809 22.148, 431.565 29.060 C 423.665 37.804, 422.525 42.784, 418.556 85.887 C 417.220 100.399, 415.723 112.677, 415.229 113.171 C 414.700 113.700, 408.222 113.450, 399.416 112.559 C 359.858 108.557, 322.070 107.028, 262.500 107.019 C 201.606 107.009, 143.383 109.833, 107.846 114.520 C 101.758 115.323, 96.445 115.775, 96.039 115.524 C 95.633 115.273, 95.012 111.340, 94.659 106.784 C 94.306 102.228, 93.556 92.425, 92.993 85 C 91.626 66.993, 89.207 46.515, 87.812 41.143 C 85.118 30.773, 73.794 20.376, 67.500 22.494';

// Carácter en escritura de bronce arcaica (jinwen) que lleva grabado el
// ding real — calco EXACTO (no a mano) de la foto de referencia del
// usuario, trazado con potrace a partir de una versión 3x sobremuestreada
// de la imagen (turdSize 0, turnPolicy minority) para conservar los dos
// huecos reales del carácter (si no, se fusionan en un bloque sólido).
// Relleno sólido con fill-rule por defecto (nonzero): potrace ya genera
// los contornos internos con el sentido de giro correcto para que esos
// huecos se rendericen como huecos de verdad, no hace falta evenodd.
const GLIFO = (await readFile(path.join(root, 'data/glifo-path.txt'), 'utf-8')).trim();

// Caja real del calco (en las coordenadas de la imagen sobremuestreada
// 621×1803, calculada sobre los puntos del path) — centro ≈ (276.12, 1057.51).
const GLIFO_CENTRO_X = 276.1175;
const GLIFO_CENTRO_Y = 1057.5145;
const GLIFO_ALTURA = 820.971;

// Fondo: degradado diagonal con varias paradas que recorren los tonos de
// una pátina de bronce real (verdigrís claro → verde de marca --color-seal
// → azul-verdoso → casi negro-azulado en la esquina), en vez de un simple
// claro-a-oscuro. Dos resplandores radiales (uno cálido arriba-izda, uno
// frío abajo-dcha) añaden el efecto de que el color "se mueve", mismo
// espíritu que iconos tipo Disney+. SEAL es el único tono que viene
// literalmente de la marca (--color-seal, globals.css); los demás son
// variaciones de pátina alrededor de ese mismo verde, no colores sueltos.
const PATINA = [
  [0, '#5fab9c'], // verdigrís claro
  [25, '#2c6e64'], // --color-seal (marca)
  [55, '#245a68'], // vira a azul-verdoso
  [80, '#1b4049'], // azul oscuro
  [100, '#102a33'], // azul oscuro, rincón
];

// `escala`/`despl` centran el ding dejando más o menos margen — el
// maskable necesita más (zona segura ~80% del lienzo, Android puede
// recortar en círculo) que los iconos normales. El ding va SOLO con
// contorno (hueco), igual que VasijaSpinner.tsx — nunca relleno sólido —
// por eso el stroke-width se define en el espacio del path (16, como el
// spinner) y escala junto con él dentro del mismo transform.
// Centro del vientre del ding en el espacio 512×512 de CONTORNO, y altura
// objetivo del glifo ahí dentro (más grande que el primer intento a mano).
const GLIFO_CENTRO_DING_X = 256;
const GLIFO_CENTRO_DING_Y = 245;
const GLIFO_ALTURA_OBJETIVO = 230;
const glifoEscala = GLIFO_ALTURA_OBJETIVO / GLIFO_ALTURA;
const glifoDespl = {
  x: GLIFO_CENTRO_DING_X - GLIFO_CENTRO_X * glifoEscala,
  y: GLIFO_CENTRO_DING_Y - GLIFO_CENTRO_Y * glifoEscala,
};

function svgIcono({ escala, despl, deslX, deslY, ancho = 1024, alto = 1024 }) {
  const dx = deslX ?? despl;
  const dy = deslY ?? despl;
  const paradas = PATINA.map(([pos, color]) => `<stop offset="${pos}%" stop-color="${color}" />`).join('\n      ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <defs>
    <linearGradient id="fondo" x1="5%" y1="0%" x2="100%" y2="100%">
      ${paradas}
    </linearGradient>
    <radialGradient id="brilloCalido" cx="26%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.03" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="rinconOscuro" cx="88%" cy="90%" r="60%">
      <stop offset="0%" stop-color="#020a0e" stop-opacity="0.3" />
      <stop offset="55%" stop-color="#020a0e" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#020a0e" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="blancoGris" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#f5f5f5" />
      <stop offset="100%" stop-color="#6b6b6b" />
    </linearGradient>
    <!-- El glifo es pequeño y va casi todo en la mitad inferior-derecha del
         ding (la zona ya oscurecida por blancoGris) — con el mismo
         degradado fuerte queda casi gris entero. Degradado propio, mucho
         más suave, para que el carácter siga leyéndose casi blanco. -->
    <linearGradient id="blancoGrisSuave" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e6e6e6" />
    </linearGradient>
    <!-- Bisel real (no simulado): difumina la máscara de alfa del propio
         trazo/relleno y le aplica una luz direccional (misma esquina que
         el resplandor cálido del fondo, arriba-izda), componiendo el
         resultado especular de vuelta sobre la forma original. -->
    <filter id="bisel" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
      <feSpecularLighting in="blur" surfaceScale="2.5" specularConstant="0.75" specularExponent="14" lighting-color="#ffffff" result="luz">
        <feDistantLight azimuth="235" elevation="55" />
      </feSpecularLighting>
      <feComposite in="luz" in2="SourceAlpha" operator="in" result="luzRecortada" />
      <feComposite in="SourceGraphic" in2="luzRecortada" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
    </filter>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="url(#fondo)" />
  <rect width="${ancho}" height="${alto}" fill="url(#brilloCalido)" />
  <rect width="${ancho}" height="${alto}" fill="url(#rinconOscuro)" />
  <g transform="translate(${dx}, ${dy}) scale(${escala})" filter="url(#bisel)">
    <path d="${CONTORNO}" fill="none" stroke="url(#blancoGris)" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" />
    <g transform="translate(${glifoDespl.x}, ${glifoDespl.y}) scale(${glifoEscala})">
      <path d="${GLIFO}" fill="url(#blancoGrisSuave)" fill-rule="evenodd" />
    </g>
  </g>
</svg>`;
}

// Bounding box real del CONTORNO (calculado sobre las 512 unidades
// originales, igual que el viewBox de VasijaSpinner.tsx): x en
// [38.333, 474.456], y en [20.376, 492.354] — centro ≈ (256.4, 256.4),
// prácticamente ya centrado en el lienzo 512×512 original. `escala`
// coloca el lado más largo (la altura, 472) a la fracción deseada de los
// 1024px del lienzo final; `despl` recoloca ese centro en (512, 512).
const BBOX_CENTRO = 256.4;
const ALTURA_PATH = 471.978;
function parametros(fraccion) {
  const escala = (1024 * fraccion) / ALTURA_PATH;
  const despl = 512 - BBOX_CENTRO * escala;
  return { escala, despl };
}

// Ding ocupando ~72% del lienzo (icono normal) vs ~56% (maskable, con
// margen de seguridad de sobra para el recorte circular de Android).
const ICONO_NORMAL = svgIcono(parametros(0.72));
const ICONO_MASKABLE = svgIcono(parametros(0.56));

// Imagen Open Graph (vista previa al pasar la URL por WhatsApp y similares)
// — mismo lienzo que icon.png pero 1200×630 (tamaño estándar OG), con el
// ding centrado en el lado más corto (la altura) para que no quede ni
// minúsculo ni recortado por los lados.
const OG_ANCHO = 1200;
const OG_ALTO = 630;
function parametrosOg(fraccion) {
  const escala = (OG_ALTO * fraccion) / ALTURA_PATH;
  return { escala, deslX: OG_ANCHO / 2 - BBOX_CENTRO * escala, deslY: OG_ALTO / 2 - BBOX_CENTRO * escala, ancho: OG_ANCHO, alto: OG_ALTO };
}
const ICONO_OG = svgIcono(parametrosOg(0.78));

async function escribir(svg, destino, width, height = width) {
  await mkdir(path.dirname(destino), { recursive: true });
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(destino);
  console.log(`✓ ${path.relative(root, destino)} (${width}x${height})`);
}

await escribir(ICONO_NORMAL, path.join(root, 'app/icon.png'), 512);
await escribir(ICONO_NORMAL, path.join(root, 'app/apple-icon.png'), 180);
await escribir(ICONO_NORMAL, path.join(root, 'public/icons/icon-192.png'), 192);
await escribir(ICONO_NORMAL, path.join(root, 'public/icons/icon-512.png'), 512);
await escribir(ICONO_MASKABLE, path.join(root, 'public/icons/icon-maskable-512.png'), 512);
await escribir(ICONO_OG, path.join(root, 'app/opengraph-image.png'), OG_ANCHO, OG_ALTO);

// favicon.ico (pestañas de Chrome y similares) — Next.js sirve app/icon.png
// como <link rel="icon">, pero /favicon.ico es una ruta fija aparte que
// varios navegadores piden directamente, así que tiene que llevar el mismo
// diseño. sharp no escribe .ico; se renderizan los 3 tamaños habituales a
// PNG y se empaquetan con png-to-ico.
const pngToIco = (await import('png-to-ico')).default;
const tamañosFavicon = [16, 32, 48];
const pngsFavicon = await Promise.all(
  tamañosFavicon.map((s) => sharp(Buffer.from(ICONO_NORMAL)).resize(s, s).png().toBuffer()),
);
const ico = await pngToIco(pngsFavicon);
await writeFile(path.join(root, 'app/favicon.ico'), ico);
console.log(`✓ app/favicon.ico (${tamañosFavicon.join('/')} )`);

console.log('\nListo.');
