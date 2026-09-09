import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
    css: true,
  },

  preview: {
    allowedHosts: [
      "reasonable-growth-production-a6c1.up.railway.app",
    ],
  },
});