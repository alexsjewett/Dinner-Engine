import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages hosts project sites under /<repository-name>/.
// Use "/" here if the site later moves to a dedicated domain.
export default defineConfig({
  base: "/Dinner-Engine/",
  plugins: [react()],
});
