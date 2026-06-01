// PNG 96x96 con "CDB" en blanco sobre transparente REAL.
// Generado dinámicamente con pngjs para que Android lo tinte correctamente.
import { PNG } from "npm:pngjs@7.0.0";

// Bitmap 5x7 de las letras C, D, B (1 = píxel blanco, 0 = transparente)
const FONT = {
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
};

const W = 96, H = 96;
const png = new PNG({ width: W, height: H });
png.data.fill(0); // todo transparente

// Renderizar "CDB" centrado, escalado x10
const SCALE = 10;
const LETTERS = ["C","D","B"];
const LETTER_W = 5 * SCALE;
const GAP = 2 * SCALE;
const TOTAL_W = LETTERS.length * LETTER_W + (LETTERS.length - 1) * GAP;
const TOTAL_H = 7 * SCALE;
const startX = Math.floor((W - TOTAL_W) / 2);
const startY = Math.floor((H - TOTAL_H) / 2);

LETTERS.forEach((letter, li) => {
  const glyph = FONT[letter];
  const offsetX = startX + li * (LETTER_W + GAP);
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === "1") {
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            const x = offsetX + col * SCALE + dx;
            const y = startY + row * SCALE + dy;
            const idx = (W * y + x) << 2;
            png.data[idx] = 255;     // R
            png.data[idx + 1] = 255; // G
            png.data[idx + 2] = 255; // B
            png.data[idx + 3] = 255; // A
          }
        }
      }
    }
  }
});

const PNG_BYTES = PNG.sync.write(png);

Deno.serve(() => new Response(PNG_BYTES, {
  headers: {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*"
  }
}));