// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  vite: {
    // Native file events are unreliable on this Windows/D: drive setup,
    // so HMR and the dev render cache miss source edits. Polling fixes it.
    server: {
      watch: {
        usePolling: true,
        interval: 200,
      },
    },
  },

  adapter: vercel(),
});