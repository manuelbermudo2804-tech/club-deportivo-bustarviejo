Deno.serve(async (req) => {
  try {
    const target = new URL('/PwaEntry', req.url).toString();
    return Response.redirect(target, 302);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});