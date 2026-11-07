import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config/site.ts';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'always' },
  integrations: [sitemap()],
  vite: { build: { chunkSizeWarningLimit: 700 } },
  image: {
    layout: 'constrained',
  },
});
