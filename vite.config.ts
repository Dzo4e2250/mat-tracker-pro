import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8084,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - velike knjižnice ločene za boljše caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-popover'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-xlsx': ['xlsx'],
          'vendor-qr': ['html5-qrcode', 'qrcode.react'],
          'vendor-pdf': ['jspdf', 'pdf-lib'],
        },
      },
    },
  },
}));
