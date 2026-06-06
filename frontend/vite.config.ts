import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/watchlist": "http://localhost:8000",
      "/analysis": "http://localhost:8000",
      "/import": "http://localhost:8000",
    },
  },
});
