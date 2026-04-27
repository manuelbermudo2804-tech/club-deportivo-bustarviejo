Deno.serve(async (_req) => {
  const manifest = {
    name: "CD Bustarviejo",
    short_name: "CD Bustarviejo",
    start_url: "/PwaEntry",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e1e1e",
    icons: [
      { src: "https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
});