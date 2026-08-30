import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs make the same build work at
  // https://USER.github.io/REPOSITORY/ without hardcoding the repo name.
  base: './',
});
