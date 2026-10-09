import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // Testes com userEvent digitam tecla por tecla; numa maquina carregada
    // (ou no CI) os 5 s padrao nao bastam.
    testTimeout: 15000
  }
});
