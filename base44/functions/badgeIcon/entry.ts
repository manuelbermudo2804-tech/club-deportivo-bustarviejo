// Renderiza "CDB" como PNG con transparencia REAL para usar como badge
// en notificaciones push de Android. Android usa solo el canal alfa y
// rellena la silueta de blanco en la barra de estado.
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';

// Texto "CDB" como paths vectoriales (no depende de fuentes del sistema).
// Tres letras en una tipografía bold sans-serif, color blanco, fondo transparente.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <g transform="translate(48 48) scale(2.6) translate(-48 -48)">
    <!-- C -->
    <path fill="#ffffff" d="M22 48c0-9 6-15 14-15 4 0 7 1 10 4l-4 5c-2-2-4-3-6-3-4 0-7 3-7 9s3 9 7 9c2 0 5-1 7-3l4 5c-3 3-7 4-11 4-8 0-14-6-14-15z"/>
    <!-- D -->
    <path fill="#ffffff" d="M50 33h9c8 0 14 5 14 15s-6 15-14 15h-9V33zm6 6v18h3c4 0 7-3 7-9s-3-9-7-9h-3z"/>
    <!-- B -->
    <path fill="#ffffff" d="M76 33h11c5 0 8 3 8 7 0 3-1 5-4 6 3 1 5 3 5 7 0 5-3 8-9 8H76V33zm6 6v6h4c2 0 3-1 3-3s-1-3-3-3h-4zm0 12v7h5c2 0 3-2 3-4 0-2-1-3-3-3h-5z"/>
  </g>
</svg>`;

let wasmReady = null;
let cachedPng = null;
const CACHE_KEY = 'v5';

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
        "X-Badge-Version": CACHE_KEY,
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(`error: ${e.message}`, { status: 500 });
  }
});