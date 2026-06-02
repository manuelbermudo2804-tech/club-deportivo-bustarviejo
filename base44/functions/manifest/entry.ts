Deno.serve(async (_req) => {
  // Iconos servidos vía proxy desde el mismo dominio app.cdbustarviejo.com
  // para evitar bloqueos de operadores/firewalls al dominio media.base44.com
  const ICON_ANY = "/functions/appIcon?v=any";
  const ICON_MASKABLE = "/functions/appIcon?v=maskable";

  const manifest = {
    name: "CD Bustarviejo",
    short_name: "CD Bustarviejo",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#15803d",
    icons: [
      // Iconos "any" — pantalla de inicio sin recortar (iOS, MIUI, Chrome Desktop)
      { src: ICON_ANY, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICON_ANY, sizes: "512x512", type: "image/png", purpose: "any" },
      // Iconos "maskable" — versión con safe-zone para Samsung One UI / Android Adaptive
      { src: ICON_MASKABLE, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: ICON_MASKABLE, sizes: "512x512", type: "image/png", purpose: "maskable" }
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