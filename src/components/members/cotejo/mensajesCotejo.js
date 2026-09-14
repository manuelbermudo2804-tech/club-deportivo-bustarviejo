// Mensajes precargados para contactar a los resultados del cotejo.
// tipo: 'ex_socio' (fue socio y no ha renovado) | 'nuevo' (nunca ha sido socio)

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const EMAIL_CLUB = "info@clubdeportivobustarviejo.com";
const WEB_CLUB = "https://cdbustarviejo.com";

export const buildWhatsAppMessage = ({ nombre, tipo, temporada, url }) => {
  const nombreCorto = (nombre || "").split(" ")[0] || "";
  const cabecera = `Hola ${nombreCorto} 👋 Te escribimos desde el *Club Deportivo Bustarviejo* (no es publicidad, somos el club del pueblo 💚⚽).`;

  if (tipo === "ex_socio") {
    return `${cabecera}

Fuiste socio/a nuestro y queríamos escribirte personalmente: sin gente como tú, esto no existiría. Gracias de verdad por haber estado ahí.

Este año seguimos con más de 200 niños y niñas de Bustarviejo entrenando cada semana. Para muchos de ellos el club es su sitio: donde hacen amigos, donde aprenden a perder y a levantarse, donde se sienten parte de algo.

Mantener todo eso cuesta: equipaciones, fichas, arbitrajes, material, transporte... y lo sacamos adelante entre todos.

Tu carnet de socio son *25€ al año*. Poco para ti, muchísimo para ellos.

¿Nos ayudas a seguir un año más?
${url}

Si prefieres que te lo expliquemos, escríbenos: ${EMAIL_CLUB}

Gracias por estar 💚
*CD Bustarviejo*`;
  }

  return `${cabecera}

Te escribimos porque nos encantaría contar contigo como socio/a esta temporada *${temporada || ""}*.

Somos un club de pueblo, sin grandes patrocinadores: más de 200 niños y niñas de Bustarviejo que entrenan cada semana y para los que el club es su sitio, donde hacen amigos y aprenden mucho más que deporte.

Todo eso lo sostenemos entre vecinos: equipaciones, fichas, arbitrajes, material, desplazamientos...

Ser socio/a son *25€ al año*. No es una cuota, es echarnos una mano para que ningún niño se quede fuera.

Puedes hacerlo aquí en un minuto:
${url}

Cualquier duda, aquí estamos: ${EMAIL_CLUB}

Gracias de corazón 💚
*CD Bustarviejo*`;
};

const wrapEmail = (titulo, parrafos, url, cta) => `
<div style="background:#f6f7f9;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06);">
    <div style="background:linear-gradient(135deg,#ea580c,#15803d);padding:24px;text-align:center;">
      <img src="${LOGO_URL}" alt="CD Bustarviejo" width="76" height="76" style="border-radius:50%;background:#fff;padding:4px;display:block;margin:0 auto 10px;" />
      <div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:.3px;">CLUB DEPORTIVO BUSTARVIEJO</div>
      <div style="color:rgba(255,255,255,.9);font-size:13px;margin-top:2px;">Deporte base en Bustarviejo</div>
    </div>
    <div style="padding:28px 26px;color:#1f2937;font-size:16px;line-height:1.65;">
      <h1 style="margin:0 0 16px;font-size:21px;color:#0f172a;">${titulo}</h1>
      ${parrafos.map((p) => `<p style="margin:0 0 14px;">${p}</p>`).join("")}
      <div style="text-align:center;margin:26px 0 8px;">
        <a href="${url}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:17px;padding:15px 32px;border-radius:12px;">${cta}</a>
        <p style="margin:10px 0 0;font-size:13px;color:#6b7280;">Tarda menos de un minuto · 25 € al año</p>
      </div>
    </div>
    <div style="padding:18px 26px 26px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.6;">
      <p style="margin:0 0 6px;">Este correo lo envía el <strong>Club Deportivo Bustarviejo</strong>, el club de fútbol y baloncesto de Bustarviejo (Madrid).</p>
      <p style="margin:0;">¿Dudas o quieres que te llamemos? Escríbenos a <a href="mailto:${EMAIL_CLUB}" style="color:#ea580c;">${EMAIL_CLUB}</a> · <a href="${WEB_CLUB}" style="color:#15803d;">cdbustarviejo.com</a></p>
    </div>
  </div>
</div>`;

export const buildEmailContent = ({ nombre, tipo, temporada, url }) => {
  const nombreCorto = (nombre || "").split(" ")[0] || "";
  const saludo = nombreCorto ? `Hola ${nombreCorto},` : "Hola,";

  if (tipo === "ex_socio") {
    return {
      subject: "Te echamos de menos en el CD Bustarviejo 💚",
      body: wrapEmail(
        "Fuiste parte de esto. Y se nota que ya no estás.",
        [
          saludo,
          "Te escribimos desde el <strong>Club Deportivo Bustarviejo</strong>. Fuiste socio/a nuestro y queríamos darte las gracias de verdad: sin vecinos como tú, este club simplemente no existiría.",
          `Esta temporada <strong>${temporada || ""}</strong> seguimos con más de 200 niños y niñas del pueblo entrenando cada semana. Para muchos de ellos el club es <em>su sitio</em>: donde hacen amigos, donde aprenden a perder y a levantarse, donde se sienten parte de algo.`,
          "Mantenerlo cuesta: equipaciones, fichas, arbitrajes, material, desplazamientos… y lo sacamos adelante entre todos, sin grandes patrocinadores.",
          "Tu carnet de socio son <strong>25 € al año</strong>. Poco para ti, muchísimo para ellos.",
          "¿Nos acompañas un año más?",
        ],
        url,
        "Renovar mi carnet de socio"
      ),
    };
  }

  return {
    subject: "Necesitamos tu ayuda: hazte socio del CD Bustarviejo 💚",
    body: wrapEmail(
      "Somos el club del pueblo. Y necesitamos tu ayuda.",
      [
        saludo,
        "Te escribimos desde el <strong>Club Deportivo Bustarviejo</strong>, el club de fútbol y baloncesto de nuestro pueblo. No te estamos vendiendo nada: te estamos pidiendo una mano.",
        `Esta temporada <strong>${temporada || ""}</strong> más de 200 niños y niñas de Bustarviejo entrenan cada semana con nosotros. Para muchos, el club es <em>su sitio</em>: donde hacen amigos, donde aprenden esfuerzo y compañerismo, donde se sienten parte de algo.`,
        "Todo esto lo sostenemos entre vecinos: equipaciones, fichas, arbitrajes, material, desplazamientos… y cada año hay familias que necesitan ayuda para que su hijo o hija pueda jugar.",
        "Ser socio/a son <strong>25 € al año</strong>. No es una cuota: es que ningún niño de Bustarviejo se quede fuera.",
        "¿Nos echas una mano?",
      ],
      url,
      "Quiero hacerme socio/a"
    ),
  };
};

export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 9) cleaned = "34" + cleaned;
  return cleaned.length >= 11 ? cleaned : null;
};