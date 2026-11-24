import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = fileURLToPath(new URL('../backend/', import.meta.url));

export default defineConfig(({ mode }) => {
  const keys = ['PORT', 'FRONTEND_PORT'];
  const local = { ...loadEnv(mode, root, keys), ...loadEnv(mode, backend, keys) };
  const port = Number(local.FRONTEND_PORT || 5173);
  const proxy = { '/api': 'http://127.0.0.1:' + (local.PORT || 4310) };
  const network = { host: '127.0.0.1', port, strictPort: true, proxy };
  return { plugins: [react()], server: network, preview: network };
});
