import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { profile } from './src/config/profile';

// User site (<id>.github.io) is served from the domain root, so no `base`.
export default defineConfig({
  site: profile.siteUrl,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
