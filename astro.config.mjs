import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://rigalis.me',
  integrations: [mdx(), react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
    host: true,
  },
  devToolbar: { enabled: false },
})
