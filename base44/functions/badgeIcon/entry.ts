// Serves the CDB shield badge PNG for Android push notifications.
// The image is hosted on Base44 storage; this function proxies it with
// aggressive caching so notifications render fast on all devices.

const BADGE_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/5837f9d6a_generated_image.png";

Deno.serve(async (_req) => {
  try {
    const upstream = await fetch(BADGE_URL);
    if (!upstream.ok) {
      return new Response("Badge not available", { status: 502 });
    }
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response("Error: " + err.message, { status: 500 });
  }
});