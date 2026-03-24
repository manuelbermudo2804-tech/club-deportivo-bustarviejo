Deno.serve(async (req) => {
  try {
    return Response.redirect('/PwaEntry', 302);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});