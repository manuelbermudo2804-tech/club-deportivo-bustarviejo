// Sirve el escudo del CD Bustarviejo como badge PNG con transparencia
// para notificaciones push de Android. Hace proxy de la imagen generada
// y la cachea en memoria.
const BADGE_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/5d5f10b2f_generated_image.png";

let cachedPng = null;

// bump cache key on each badge image change to force re-fetch
const CACHE_VERSION = 2;

Deno.serve(async () => {
  try {
    if (!cachedPng) {
      const resp = await fetch(BADGE_URL);
      cachedPng = new Uint8Array(await resp.arrayBuffer());
    }
    return new Response(cachedPng, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(`error: ${e.message}`, { status: 500 });
  }
});