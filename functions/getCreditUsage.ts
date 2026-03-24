import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Returns real credit usage data by reading automation run counts
 * and estimating frontend-triggered credits (UploadFile, functions.invoke).
 * Only admins can call this.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Count file uploads this month (UploadFile = 1 credit each)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Count players created/updated this month (each has foto_url = 1 upload)
    let uploadCredits = 0;
    const recentPlayers = await base44.asServiceRole.entities.Player.filter({
      updated_date: { $gte: monthStart }
    });
    for (const p of recentPlayers) {
      if (p.foto_url) uploadCredits++;
      if (p.dni_jugador_url) uploadCredits++;
      if (p.dni_jugador_trasero_url) uploadCredits++;
      if (p.dni_tutor_legal_url) uploadCredits++;
      if (p.dni_tutor_legal_trasero_url) uploadCredits++;
      if (p.libro_familia_url) uploadCredits++;
    }

    // Count payment receipts uploaded this month
    const recentPayments = await base44.asServiceRole.entities.Payment.filter({
      updated_date: { $gte: monthStart }
    });
    for (const p of recentPayments) {
      if (p.justificante_url) uploadCredits++;
    }

    // Count clothing order receipts
    const recentClothing = await base44.asServiceRole.entities.ClothingOrder.filter({
      updated_date: { $gte: monthStart }
    });
    for (const o of recentClothing) {
      if (o.justificante_url) uploadCredits++;
    }

    // Count member payment receipts
    const recentMembers = await base44.asServiceRole.entities.ClubMember.filter({
      updated_date: { $gte: monthStart }
    });
    for (const m of recentMembers) {
      if (m.justificante_url) uploadCredits++;
    }

    // Chat attachments (photos/files)
    const recentMessages = await base44.asServiceRole.entities.ChatMessage.filter({
      created_date: { $gte: monthStart }
    }, '-created_date', 500);
    let chatUploads = 0;
    for (const msg of recentMessages) {
      if (msg.archivos_adjuntos?.length) chatUploads += msg.archivos_adjuntos.length;
      if (msg.audio_url) chatUploads++;
    }
    uploadCredits += chatUploads;

    // Gallery photos
    const recentGalleries = await base44.asServiceRole.entities.PhotoGallery.filter({
      updated_date: { $gte: monthStart }
    });
    let galleryUploads = 0;
    for (const g of recentGalleries) {
      if (g.fotos?.length) galleryUploads += g.fotos.length;
    }
    uploadCredits += galleryUploads;

    // 2. Stripe function calls (estimated from payment/member records with stripe IDs)
    let stripeCredits = 0;
    for (const p of recentPayments) {
      if (p.stripe_subscription_id) stripeCredits++;
    }
    for (const m of recentMembers) {
      if (m.stripe_subscription_id || m.stripe_customer_id) stripeCredits++;
    }

    // 3. Lottery orders
    let lotteryOrderCount = 0;
    try {
      const lotOrders = await base44.asServiceRole.entities.LotteryOrder.filter({
        created_date: { $gte: monthStart }
      });
      lotteryOrderCount = lotOrders.length;
    } catch {}

    // Summary
    const result = {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      day_of_month: now.getDate(),
      uploads: {
        player_docs: recentPlayers.reduce((s, p) => {
          let c = 0;
          if (p.foto_url) c++; if (p.dni_jugador_url) c++; if (p.dni_jugador_trasero_url) c++;
          if (p.dni_tutor_legal_url) c++; if (p.dni_tutor_legal_trasero_url) c++; if (p.libro_familia_url) c++;
          return s + c;
        }, 0),
        payment_receipts: recentPayments.filter(p => p.justificante_url).length,
        clothing_receipts: recentClothing.filter(o => o.justificante_url).length,
        member_receipts: recentMembers.filter(m => m.justificante_url).length,
        chat_attachments: chatUploads,
        gallery_photos: galleryUploads,
        total: uploadCredits,
      },
      stripe_calls: stripeCredits,
      lottery_orders: lotteryOrderCount,
      total_estimated_non_automation: uploadCredits + stripeCredits,
    };

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});