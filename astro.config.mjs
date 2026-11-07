import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config/site.ts';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  integrations: [sitemap({ filter: (page) => !page.includes('/dev/') })],
  image: {
    layout: 'constrained',
  },
});
