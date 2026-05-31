// Renderiza "CDB" como PNG con transparencia REAL para usar como badge
// en notificaciones push de Android. Android usa solo el canal alfa y
// rellena la silueta de blanco en la barra de estado.
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';

// Texto "CDB" como paths vectoriales (no depende de fuentes del sistema).
// Tres letras en una tipografía bold sans-serif, color blanco, fondo transparente.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <path fill="#ffffff" fill-rule="evenodd" d="M48 2a46 46 0 1 0 0.01 0zM48 28l16.6 12.06-6.34 19.51H37.74l-6.34-19.51zM48 14l-3.5 6h7zM82 40l-6-3.2-2.2 6.8zM68.5 78l-1.5-6.7-5.8 3.8zM27.5 78l7.3-2.9-5.8-3.8zM14 40l8.2 3.6-2.2-6.8z"/>
</svg>`;

let wasmReady = null;
let cachedPng = null;
const CACHE_KEY = 'v7';

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