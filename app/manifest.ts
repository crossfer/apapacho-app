import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apapacho Homes',
    short_name: 'Apapacho',
    description: 'Premium home care services in San Diego & Los Angeles',
    start_url: '/',
    display: 'standalone',
    background_color: '#4F6D5A',
    theme_color: '#4F6D5A',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
