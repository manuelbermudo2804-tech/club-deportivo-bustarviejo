// Manifest PWA. Iconos servidos vía proxy (/functions/appIcon) desde el mismo
// dominio app.cdbustarviejo.com para evitar bloqueos de media.base44.com.
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const ICON_ANY_192 = `${origin}/functions/appIcon?v=any&s=192&r=4`;
  const ICON_ANY_512 = `${origin}/functions/appIcon?v=any&s=512&r=4`;
  const ICON_MASKABLE_192 = `${origin}/functions/appIcon?v=maskable&s=192&r=4`;
  const ICON_MASKABLE_512 = `${origin}/functions/appIcon?v=maskable&s=512&r=4`;

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
      { src: ICON_ANY_192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICON_ANY_512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: ICON_MASKABLE_192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: ICON_MASKABLE_512, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    share_target: {
      action: "/ShareReceiver",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: ["image/*"]
          }
        ]
      }
    }
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