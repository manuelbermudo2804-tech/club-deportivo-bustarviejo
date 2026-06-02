// Proxy del icono PWA — sirve el PNG desde app.cdbustarviejo.com
// para evitar bloqueos de redes/firewalls al dominio media.base44.com
const ICONS = {
  any: "https://media.base44.com/images/public/6992c6be619d2da592897991/e4665760a_image.png",
  maskable: "https://media.base44.com/images/public/6992c6be619d2da592897991/6805b8b37_generated_image.png"
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const variant = url.searchParams.get("v") === "maskable" ? "maskable" : "any";
    const src = ICONS[variant];

    const upstream = await fetch(src);
    if (!upstream.ok) {
      return new Response("Icon fetch failed", { status: 502 });
    }
    const bytes = await upstream.arrayBuffer();

    return new Response(bytes, {
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