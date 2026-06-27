// Proxy/compositor del icono PWA — sirve el PNG desde app.cdbustarviejo.com
// para evitar bloqueos de redes/firewalls al dominio media.base44.com.
//
// - variant "any":      escudo a sangre completa (se ve dentro de un cuadrado/redondeado).
// - variant "maskable": escudo REDUCIDO y CENTRADO sobre fondo verde, con margen de
//   seguridad (~17%) para que Android pueda recortarlo a círculo/squircle sin cortar
//   el escudo ni mostrar el icono genérico con la inicial ("C").
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const ICON_SRC = "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png";
const GREEN = 0x15803dff; // #15803d (theme verde del club), RGBA

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const variant = url.searchParams.get("v") === "maskable" ? "maskable" : "any";

    const upstream = await fetch(ICON_SRC);
    if (!upstream.ok) {
      return new Response("Icon fetch failed", { status: 502 });
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());

    // El icono "any" se sirve tal cual (escudo a sangre).
    if (variant === "any") {
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // variant "maskable": componer escudo reducido sobre fondo verde con safe-zone.
    const SIZE = 512;
    const SAFE = 0.66; // el escudo ocupa el 66% → ~17% de margen por cada lado

    const crest = await Image.decode(bytes);
    const target = Math.round(SIZE * SAFE);
    crest.resize(target, target); // mantiene proporción (la fuente es cuadrada)

    const canvas = new Image(SIZE, SIZE);
    canvas.fill(GREEN);
    const offset = Math.round((SIZE - target) / 2);
    canvas.composite(crest, offset, offset);

    const out = await canvas.encode();

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