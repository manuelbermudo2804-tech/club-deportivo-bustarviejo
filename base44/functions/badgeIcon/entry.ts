// Sirve un balón de fútbol SVG con transparencia REAL para usar
// como "badge" en notificaciones push de Android.
// Diseño: círculo blanco con pentágonos calados (transparentes)
// para que al renderizarlo en monocromo se reconozca como balón.
Deno.serve(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><mask id="m"><circle cx="48" cy="48" r="40" fill="#fff"/><polygon points="48,30 60,39 55,53 41,53 36,39" fill="#000"/><polygon points="28,55 36,49 43,57 37,68 27,64" fill="#000"/><polygon points="68,55 69,64 59,68 53,57 60,49" fill="#000"/><polygon points="42,66 54,66 58,76 48,82 38,76" fill="#000"/></mask><circle cx="48" cy="48" r="40" fill="#fff" mask="url(#m)"/></svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*"
    }
  });
});