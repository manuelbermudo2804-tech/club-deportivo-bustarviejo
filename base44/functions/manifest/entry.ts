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
      { src: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg", sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any maskable" }
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