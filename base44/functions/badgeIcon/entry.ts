// Sirve el escudo del CD Bustarviejo como badge PNG con transparencia
// para notificaciones push de Android. Hace proxy de la imagen generada
// y la cachea en memoria.
const BADGE_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/58b7397e5_generated_image.png";

let cachedPng = null;

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