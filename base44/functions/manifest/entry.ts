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
      { src: "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
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