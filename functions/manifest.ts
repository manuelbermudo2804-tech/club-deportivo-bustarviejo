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
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
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