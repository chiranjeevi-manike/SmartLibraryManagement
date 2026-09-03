import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  preview: {
    allowedHosts: [
      "reasonable-growth-production-a6c1.up.railway.app"
    ]
  }
});