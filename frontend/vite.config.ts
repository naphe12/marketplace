import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  preview: {
    allowedHosts: ['accomplished-trust-staging.up.railway.app'],
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
