// Manifest PWA con iconos embebidos en base64 (data URLs).
// Esto elimina cualquier dependencia de dominios externos (media.base44.com)
// que puedan estar bloqueados por operadores móviles o firewalls.
const ICON_ANY_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png";
const ICON_MASKABLE_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/6805b8b37_generated_image.png";

// Cache en memoria (vive mientras la función esté caliente)
let cachedAny = null;
let cachedMaskable = null;

async function toDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed " + res.status);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Convertir a base64 sin desbordar la stack
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return "data:image/png;base64," + btoa(binary);
}

Deno.serve(async (_req) => {
  try {
    if (!cachedAny) cachedAny = await toDataUrl(ICON_ANY_URL);
    if (!cachedMaskable) cachedMaskable = await toDataUrl(ICON_MASKABLE_URL);

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
        { src: cachedAny, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: cachedAny, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: cachedMaskable, sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: cachedMaskable, sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };

    return new Response(JSON.stringify(manifest), {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});