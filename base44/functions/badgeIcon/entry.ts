// Renderiza "CDB" como PNG con transparencia REAL para usar como badge
// en notificaciones push de Android. Android usa solo el canal alfa y
// rellena la silueta de blanco en la barra de estado.
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';

// Texto "CDB" como paths vectoriales (no depende de fuentes del sistema).
// Tres letras en una tipografía bold sans-serif, color blanco, fondo transparente.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <path fill="#ffffff" fill-rule="evenodd" d="M48 4a44 44 0 1 1 0 88 44 44 0 0 1 0-88zm0 28-15.2 11.04 5.81 17.88h18.78l5.81-17.88z"/>
</svg>`;

let wasmReady = null;
let cachedPng = null;
const CACHE_KEY = 'v8';

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