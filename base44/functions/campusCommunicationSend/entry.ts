import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// El Campus utiliza el mismo envío directo por Resend que el resto de la app.
async function sendCampusEmail(to, subject, message) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY no está configurada en esta aplicación.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "CD Bustarviejo <noreply@cdbustarviejo.com>",
      to: [to],
      subject,
      text: message
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[campusCommunicationSend] Resend rechazó el correo:", response.status, result);
    throw new Error(result?.message || result?.error || `Resend devolvió HTTP ${response.status}.`);
  }
  console.log("[campusCommunicationSend] Resend aceptó el correo:", result?.id || "sin ID");
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "https://www.cdbustarviejo.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }});
  if (req.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") return Response.json({ error: "Acceso reservado a administración." }, { status: 403 });
    const { registration_id, recipient_email, recipient_name, subject, body, template_key, test_mode } = await req.json();
    const email = String(recipient_email || "").trim().toLowerCase();
    const title = String(subject || "").trim();
    const message = String(body || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !title || !message) {
      return Response.json({ error: "Faltan destinatario, asunto o contenido." }, { status: 400 });
    }

    // El correo de prueba solo puede enviarlo un administrador y no requiere inscripción.
    if (test_mode === true) {
      const sent = await sendCampusEmail(
        email,
        title.startsWith("[PRUEBA]") ? title : "[PRUEBA] " + title,
        message
      );
      return Response.json({ success: true, message: "Resend ha aceptado el correo de prueba para " + email + ".", resend_id: sent?.id || null });
    }

    if (!registration_id) {
      return Response.json({ error: "Selecciona una inscripción válida." }, { status: 400 });
    }
    const reg = await base44.asServiceRole.entities.CampusRegistration.get(registration_id);
    if (!reg || String(reg.adulto_email || "").trim().toLowerCase() !== email) {
      return Response.json({ error: "El destinatario no coincide con la inscripción seleccionada." }, { status: 400 });
    }
    const sent = await sendCampusEmail(email, title, message);
    await base44.asServiceRole.entities.CampusCommunicationLog.create({
      registration_id,
      recipient_email: email,
      recipient_name: String(recipient_name || reg.adulto_nombre || ""),
      subject: title,
      body: message,
      template_key: ["recepcion","documentacion","horarios","material","aviso","personalizado"].includes(template_key) ? template_key : "personalizado",
      sent_by: user.email || "",
      sent_at: new Date().toISOString(),
      status: "sent",
      resend_id: sent?.id || null
    });
    return Response.json({ success: true, message: "Correo enviado." });
  } catch (error) {
    console.error("[campusCommunicationSend]", error?.message || error);
    return Response.json({ error: error?.message || "No se pudo enviar el correo." }, { status: 400 });
  }
});