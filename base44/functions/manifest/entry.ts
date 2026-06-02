Deno.serve(async (_req) => {
  // Icono "any" — escudo completo, se muestra tal cual (iOS, Chrome Desktop, MIUI)
  const ICON_ANY = "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png";
  // Icono "maskable" — escudo centrado en safe-zone con fondo sólido verde
  // (Samsung One UI lo recorta a squircle; sin safe-zone se ve mal o sale genérico)
  const ICON_MASKABLE = "https://media.base44.com/images/public/6992c6be619d2da592897991/6805b8b37_generated_image.png";

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