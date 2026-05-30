// Sirve un balón de fútbol como PNG con transparencia REAL para
// usar como "badge" en notificaciones push de Android.
// Usa resvg-wasm (compatible con Deno) para renderizar SVG → PNG.
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><mask id="m"><circle cx="48" cy="48" r="40" fill="#fff"/><polygon points="48,30 60,39 55,53 41,53 36,39" fill="#000"/><polygon points="28,55 36,49 43,57 37,68 27,64" fill="#000"/><polygon points="68,55 69,64 59,68 53,57 60,49" fill="#000"/><polygon points="42,66 54,66 58,76 48,82 38,76" fill="#000"/></mask><circle cx="48" cy="48" r="40" fill="#fff" mask="url(#m)"/></svg>`;

let wasmReady = null;
let cachedPng = null;

async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const resp = await fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm');
      const buf = await resp.arrayBuffer();
      await initWasm(buf);
    })();
  }
  return wasmReady;
}

Deno.serve(async () => {
  try {
    if (!cachedPng) {
      await ensureWasm();
      const resvg = new Resvg(SVG);
      cachedPng = resvg.render().asPng();
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