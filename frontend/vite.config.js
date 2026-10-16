import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// App instalavel no celular ("Adicionar a tela inicial"), com icone e tela
// cheia. O service worker guarda so a casca do app (JS, CSS e icones); a
// pagina nao passa por ele e vem sempre da rede, para um deploy novo nao abrir
// a versao anterior, e os dados continuam vindo da API. Sem modo offline.
const pwa = VitePWA({
  registerType: 'autoUpdate',
  // Arquivo externo (registerSW.js), e nao script inline: a CSP do site
  // bloqueia scripts inline.
  injectRegister: 'script',
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'lojaRPG',
    short_name: 'lojaRPG',
    description: 'A loja da sua campanha de RPG: catálogo, ouro e inventário da mesa no celular.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#16110d',
    theme_color: '#16110d',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,svg,png,webp}'],
    navigateFallback: null,
    cleanupOutdatedCaches: true,
    // O autoUpdate so liga estes dois sozinho com o registro automatico; com o
    // registerSW.js (por causa da CSP) eles ficam aqui. Sem eles, o SW novo de
    // um deploy espera todas as abas fecharem, e o antigo segue servindo
    // manifesto e icones velhos para quem deixa o app aberto.
    skipWaiting: true,
    clientsClaim: true
  }
});

export default defineConfig({
  plugins: [react(), ...(process.env.VITEST ? [] : [pwa])],
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
