import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Short-Order Hero',
        short_name: 'ShortOrder',
        description: "A 50's diner typing arcade game — type fast, serve weird.",
        theme_color: '#d63b2a',
        background_color: '#f4e8cf',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
