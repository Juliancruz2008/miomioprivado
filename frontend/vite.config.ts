import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Permite usar el .env de la raíz sin duplicar credenciales ni configuración.
  envDir: '..',
});
