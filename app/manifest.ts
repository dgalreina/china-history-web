import type { MetadataRoute } from 'next';

// Required for `output: "export"`: the manifest is generated at build time.
export const dynamic = 'force-static';

// Same prefix as next.config.ts (GitHub Pages project site: /<repo>).
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'China History',
    short_name: 'China History',
    description: 'Explora cómo era un lugar de China en cualquier época.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#e9e7e2',
    theme_color: '#e9e7e2',
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
