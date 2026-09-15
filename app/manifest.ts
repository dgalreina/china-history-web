import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'China History',
    short_name: 'China History',
    description: 'Explora cómo era un lugar de China en cualquier época.',
    start_url: '/',
    display: 'standalone',
    background_color: '#e9e7e2',
    theme_color: '#e9e7e2',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
