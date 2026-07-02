// Sirve el icono PWA ya PRE-COMPUESTO (escudo sobre fondo verde sólido) desde
// app.cdbustarviejo.com. A diferencia de la versión anterior, NO compone la imagen
// en caliente (no descarga el escudo transparente ni lo pinta sobre verde con
// imagescript). Los PNG ya vienen con el fondo verde sólido y el margen correcto:
//   - "any":      escudo grande (~92%) — para lanzadores que no recortan.
//   - "maskable": escudo con safe-zone (~70%) — para recorte a círculo/squircle.
//
// Esto elimina la latencia de arranque en frío + procesado (~3s) que hacía que
// Samsung (One UI) y otros launchers estrictos descartaran el icono y mostraran
// la inicial genérica ("C"). Cada variante se descarga una sola vez por isolate y
// se cachea en memoria; las siguientes peticiones son instantáneas.

const ICON_ANY = "https://media.base44.com/images/public/6992c6be619d2da592897991/eeae2fcaa_generated_image.png";
const ICON_MASKABLE = "https://media.base44.com/images/public/6992c6be619d2da592897991/7670c0e03_generated_image.png";

// Caché en memoria del PNG por variante (los bytes ya listos para servir).
const CACHE = new Map<string, Uint8Array>();

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const variant = url.searchParams.get("v") === "maskable" ? "maskable" : "any";

    let out = CACHE.get(variant);
    if (!out) {
      const src = variant === "maskable" ? ICON_MASKABLE : ICON_ANY;
      const upstream = await fetch(src);
      if (!upstream.ok) {
        return new Response("Icon fetch failed", { status: 502 });
      }
      out = new Uint8Array(await upstream.arrayBuffer());
      CACHE.set(variant, out);
    }

    return new Response(out, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
});