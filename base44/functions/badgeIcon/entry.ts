// Sirve un SVG con un balón de fútbol blanco sobre fondo TRANSPARENTE real.
// Usado como `badge` en notificaciones push (Android tinta la silueta).
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="34" fill="#fff"/><path d="M48 22 L58 30 L54 42 L42 42 L38 30 Z M30 44 L40 50 L36 62 L24 58 Z M66 44 L72 58 L60 62 L56 50 Z M40 64 L56 64 L52 76 L44 76 Z" fill="#000"/></svg>`;

Deno.serve(() => new Response(SVG, {
  headers: {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*"
  }
}));