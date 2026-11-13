import type { MetadataRoute } from "next";

/** Installed-app manifest. Theme colour matches the StoneCraft graphite identity (#25292B). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StoneCraft",
    short_name: "StoneCraft",
    description: "Tile, grout, shower and natural stone restoration in Greater Boston.",
    start_url: "/",
    display: "standalone",
    background_color: "#25292B",
    theme_color: "#25292B",
    icons: [
      { src: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
