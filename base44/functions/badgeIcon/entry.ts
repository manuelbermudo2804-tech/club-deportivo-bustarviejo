// Badge para notificaciones push: texto "CDB" blanco sobre fondo transparente.
// Android tinta los píxeles blancos del canal alfa con el color del sistema.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><text x="48" y="62" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="42" fill="#ffffff">CDB</text></svg>`;

Deno.serve(() => new Response(SVG, {
  headers: {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*"
  }
}));