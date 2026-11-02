import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true,
    // Allow public Cloudflare Quick Tunnel hostnames (*.trycloudflare.com)
    allowedHosts: ['.trycloudflare.com'],
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.trycloudflare.com']
  }
});
