// Compositor del icono PWA — sirve el escudo sobre fondo VERDE SÓLIDO desde
// app.cdbustarviejo.com (evita bloqueos a media.base44.com).
//
// El PNG de origen del escudo tiene FONDO TRANSPARENTE. Android, al recortar un
// icono con transparencia, muestra el icono genérico con la inicial ("C"). Por eso
// AMBAS variantes se componen sobre fondo verde sólido (sin transparencia):
//   - "any":      escudo grande (94%) — para lanzadores que no recortan.
//   - "maskable": escudo reducido (66%) con safe-zone para recorte a círculo/squircle.
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const ICON_SRC = "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png";
const GREEN = 0x15803dff; // #15803d (verde del club), RGBA

// Caché en memoria del PNG ya compuesto por variante+tamaño. Así el escudo solo
// se descarga y procesa UNA vez por isolate; las siguientes peticiones son
// instantáneas. Esto evita que Android descarte el icono (mostrando la "C" gris)
// y no ofrezca instalar cuando la generación tardaba ~3s.
const CACHE = new Map<string, Uint8Array>();

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const variant = url.searchParams.get("v") === "maskable" ? "maskable" : "any";
    // Tamaño solicitado (el manifest pide 192 y 512). Generamos REALMENTE ese
    // tamaño: si el PNG no coincide con el "sizes" declarado, Android lo descarta
    // y cae al icono genérico ("C").
    const reqSize = parseInt(url.searchParams.get("s"), 10);
    const SIZE = reqSize === 192 ? 192 : 512;

    const cacheKey = `${variant}-${SIZE}`;
    let out = CACHE.get(cacheKey);

    if (!out) {
      const upstream = await fetch(ICON_SRC);
      if (!upstream.ok) {
        return new Response("Icon fetch failed", { status: 502 });
      }
      const bytes = new Uint8Array(await upstream.arrayBuffer());

      const SCALE = variant === "maskable" ? 0.66 : 0.94;

      const crest = await Image.decode(bytes);
      const target = Math.round(SIZE * SCALE);
      crest.resize(target, target); // la fuente es cuadrada → mantiene proporción

      const canvas = new Image(SIZE, SIZE);
      canvas.fill(GREEN); // fondo verde SÓLIDO: elimina la transparencia que causaba la "C"
      const offset = Math.round((SIZE - target) / 2);
      canvas.composite(crest, offset, offset);

      out = await canvas.encode();
      CACHE.set(cacheKey, out);
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