import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cấu hình Vite & Tối ưu hóa Code Splitting cho React app
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-bootstrap") || id.includes("bootstrap")) {
              return "vendor-bootstrap";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("sweetalert2") || id.includes("axios")) {
              return "vendor-utils";
            }
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "vendor-react";
            }
            return "vendor-misc";
          }
        },
      },
    },
  },
});
