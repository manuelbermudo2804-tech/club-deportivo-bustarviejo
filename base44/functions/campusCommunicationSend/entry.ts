import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

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
    const { registration_id, recipient_email, recipient_name, subject, body, template_key } = await req.json();
    const email = String(recipient_email || "").trim().toLowerCase();
    const title = String(subject || "").trim();
    const message = String(body || "").trim();
    if (!registration_id || !/^\S+@\S+\.\S+$/.test(email) || !title || !message) {
      return Response.json({ error: "Faltan destinatario, asunto o contenido." }, { status: 400 });
    }
    const reg = await base44.asServiceRole.entities.CampusRegistration.get(registration_id);
    if (!reg || String(reg.adulto_email || "").trim().toLowerCase() !== email) {
      return Response.json({ error: "El destinatario no coincide con la inscripción seleccionada." }, { status: 400 });
    }
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: title,
      body: message,
      from_name: "C.D. Bustarviejo · Campus 2027"
    });
    await base44.asServiceRole.entities.CampusCommunicationLog.create({
      registration_id,
      recipient_email: email,
      recipient_name: String(recipient_name || reg.adulto_nombre || ""),
      subject: title,
      body: message,
      template_key: ["recepcion","documentacion","horarios","material","aviso","personalizado"].includes(template_key) ? template_key : "personalizado",
      sent_by: user.email || "",
      sent_at: new Date().toISOString(),
      status: "sent"
    });
    return Response.json({ success: true, message: "Correo enviado." });
  } catch (error) {
    console.error("[campusCommunicationSend]", error?.message || error);
    return Response.json({ error: error?.message || "No se pudo enviar el correo." }, { status: 400 });
  }
});