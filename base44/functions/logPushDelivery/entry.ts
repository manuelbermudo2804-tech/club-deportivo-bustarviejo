import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público (sin auth) llamado desde el Service Worker cuando recibe
// una notificación push. Marca la entrega como recibida y calcula latencia.
Deno.serve(async (req) => {
  // CORS abierto — lo llama el SW desde el dominio de la PWA
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { delivery_id } = await req.json();
    if (!delivery_id) {
      return new Response(JSON.stringify({ error: 'delivery_id requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const base44 = createClientFromRequest(req);
    const matches = await base44.asServiceRole.entities.PushDelivery.filter({ delivery_id });
    if (matches.length === 0) {
      return new Response(JSON.stringify({ ok: false, reason: 'not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const record = matches[0];
    if (record.delivered) {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const receivedAt = new Date();
    const sentAt = record.sent_at ? new Date(record.sent_at) : null;
    const latency = sentAt ? receivedAt.getTime() - sentAt.getTime() : null;

    await base44.asServiceRole.entities.PushDelivery.update(record.id, {
      received_at: receivedAt.toISOString(),
      delivered: true,
      latency_ms: latency
    });

    return new Response(JSON.stringify({ ok: true, latency_ms: latency }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('logPushDelivery error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});