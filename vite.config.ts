import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Branch previews (tools/build-site.sh) set VITE_BASE to their own folder and
// VITE_PREVIEW_BRANCH to the branch name. Previews skip the offline service
// worker so they always load fresh, and the main site's worker leaves them alone.
const base = process.env.VITE_BASE ?? '/fastfoodtyping/';
const preview = Boolean(process.env.VITE_PREVIEW_BRANCH);

export default defineConfig({
  base,
  plugins: [
    !preview && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'Short-Order Hero',
        short_name: 'ShortOrder',
        description: "A 50's diner typing arcade game — type fast, serve weird.",
        theme_color: '#d63b2a',
        background_color: '#f4e8cf',
        display: 'standalone',
        // Hot Dog Hank; regenerate with `python3 tools/make-icons.py`.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['preview/**'],
        navigateFallbackDenylist: [/\/preview\//],
      },
    }),
  ],
});
