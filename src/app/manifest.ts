import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beyos Clothing",
    short_name: "Beyos",
    description: "Premium clothing and custom apparel with island-wide delivery across Sri Lanka.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10263d",
    icons: [
      { src: "/icon.png", sizes: "901x906", type: "image/png" },
      { src: "/apple-icon.png", sizes: "901x906", type: "image/png" },
    ],
  };
}
