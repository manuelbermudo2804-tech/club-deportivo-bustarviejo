Deno.serve(async (_req) => {
  const ICON_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png";

  const manifest = {
    name: "CD Bustarviejo",
    short_name: "CD Bustarviejo",
    id: "/PwaEntry",
    start_url: "/PwaEntry",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1e1e1e",
    icons: [
      // Iconos "any" — los que se muestran en la pantalla de inicio (sin recortar)
      { src: ICON_URL, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICON_URL, sizes: "512x512", type: "image/png", purpose: "any" },
      // Iconos "maskable" — separados (Chrome recorta para adaptar a la forma del sistema)
      { src: ICON_URL, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: ICON_URL, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*"
    }
  });
});