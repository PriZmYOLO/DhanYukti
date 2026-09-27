import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DhanYukti — धनयुक्ति",
    short_name: "DhanYukti",
    description: "Parivaar ka paisa saathi",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f0",
    theme_color: "#17153b",
    lang: "hi",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
