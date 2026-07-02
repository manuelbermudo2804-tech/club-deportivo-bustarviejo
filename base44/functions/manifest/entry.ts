// Manifest PWA. Iconos servidos vía proxy (/functions/appIcon) desde el mismo
// dominio app.cdbustarviejo.com para evitar bloqueos de media.base44.com.
Deno.serve(async (req) => {
  // Iconos servidos DIRECTAMENTE desde el almacenamiento estático (respuesta
  // instantánea). Antes se servían vía /functions/appIcon, pero en arranque en
  // frío la función tardaba y Chrome/Android descartaba el icono mostrando la "C".
  const ICON_ANY = "https://media.base44.com/images/public/6992c6be619d2da592897991/eeae2fcaa_generated_image.png?r=7";
  const ICON_MASKABLE = "https://media.base44.com/images/public/6992c6be619d2da592897991/7670c0e03_generated_image.png?r=7";
  const ICON_ANY_192 = ICON_ANY;
  const ICON_ANY_512 = ICON_ANY;
  const ICON_MASKABLE_192 = ICON_MASKABLE;
  const ICON_MASKABLE_512 = ICON_MASKABLE;

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