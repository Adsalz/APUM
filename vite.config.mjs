import { defineConfig, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';

// Les composants sont écrits en JSX dans des .js (héritage de CRA) ; Vite 8 ne
// lit le JSX que dans les .jsx. Ce plugin le compile avant le reste de la
// chaîne, qui reçoit alors du JavaScript ordinaire (Fast Refresh compris).
function jsxDansLesJs() {
  let development = false;
  return {
    name: 'apum:jsx-dans-les-js',
    enforce: 'pre',
    configResolved(config) {
      development = !config.isProduction;
    },
    async transform(code, id) {
      const [fichier] = id.split('?');
      if (!fichier.endsWith('.js') || fichier.includes('/node_modules/')) return null;
      const resultat = await transformWithOxc(code, fichier, {
        lang: 'jsx',
        jsx: { runtime: 'automatic', development },
      });
      return { code: resultat.code, map: resultat.map };
    },
  };
}

export default defineConfig({
  plugins: [jsxDansLesJs(), react()],

  // Les variables du .env gardent leur préfixe CRA : le code les lit via
  // import.meta.env.REACT_APP_*.
  envPrefix: ['VITE_', 'REACT_APP_'],

  server: { port: 3000 },

  build: {
    // firebase.json sert build/ et met /static/** en cache immuable.
    outDir: 'build',
    assetsDir: 'static',
    // Les médecins saisissent depuis leur téléphone : on garde les anciens
    // Safari iOS que couvrait le build CRA, pas seulement les plus récents.
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    // exceljs (930 ko) n'est chargé qu'au moment d'un export Excel.
    chunkSizeWarningLimit: 1000,
  },

  test: {
    // Comme sous CRA : seuls les tests de src/ (pas les bancs d'essai de
    // desiderata_individuels/ ni les node_modules de scripts/).
    include: ['src/**/*.test.js'],
    globals: true,
    // Comme sous CRA : DOM simulé (localStorage, window) pour tous les tests.
    environment: 'jsdom',
    // Comme le resetMocks de CRA : chaque test repart de mocks neufs.
    mockReset: true,
  },
});
