// Mensajes precargados para contactar a los resultados del cotejo.
// tipo: 'ex_socio' (fue socio y no ha renovado) | 'nuevo' (nunca ha sido socio)

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const EMAIL_CLUB = "info@cdbustarviejo.com";
const WEB_CLUB = "https://www.cdbustarviejo.com";

export const buildWhatsAppMessage = ({ nombre, tipo, temporada, url }) => {
  const nombreCorto = (nombre || "").split(" ")[0] || "";
  const cabecera = `Hola ${nombreCorto} 👋 Te escribimos desde el *Club Deportivo Bustarviejo* (no es publicidad, somos una asociación sin ánimo de lucro 💚).`;

  if (tipo === "ex_socio") {
    return `${cabecera}

En algún momento formaste parte de la familia del *C.D. Bustarviejo* como socio/a. Aunque ahora ya no apareces como socio/a, queríamos escribirte personalmente.

Estamos empezando una nueva temporada con muchas ganas, nuevos proyectos y mucha ilusión por seguir haciendo crecer el club. Y nos gustaría que volvieras a formar parte de él.

La cuota de socio es de *25 € al año* y, aunque pueda parecer una pequeña aportación, para un club como el nuestro cada socio cuenta.

Porque ser socio no es solamente pagar una cuota:
· Es apoyar al club que representa a nuestro pueblo.
· Es ayudar a nuestros equipos y a nuestros niños y niñas.
· Es participar en todo lo que estamos construyendo juntos.

Si guardas un buen recuerdo del C.D. Bustarviejo, nos encantaría que volvieras a estar con nosotros ❤️
${url}

Cualquier duda, escríbenos: ${EMAIL_CLUB}

Gracias por haber formado parte de nuestra historia.
🧡🖤 *C.D. Bustarviejo*`;
  }

  return `${cabecera}

Te escribimos porque nos encantaría contar contigo como socio/a esta temporada *${temporada || ""}*.

Somos el Club Deportivo Bustarviejo: deportistas de todas las edades, desde los más pequeños hasta los equipos de adultos. Queremos seguir creciendo, incorporar nuevas disciplinas y traer más torneos al pueblo.

Al ser una asociación sin ánimo de lucro, todo lo que entra se destina al club: equipaciones, fichas, arbitrajes, material, desplazamientos y actividades.

Ser socio/a son *25€ al año*.

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
      <div style="color:rgba(255,255,255,.9);font-size:13px;margin-top:2px;">Asociación deportiva sin ánimo de lucro</div>
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
      <p style="margin:0 0 6px;">Este correo lo envía el <strong>Club Deportivo Bustarviejo</strong>, asociación deportiva sin ánimo de lucro de Bustarviejo (Madrid).</p>
      <p style="margin:0;">¿Dudas o quieres que te llamemos? Escríbenos a <a href="mailto:${EMAIL_CLUB}" style="color:#ea580c;">${EMAIL_CLUB}</a> · <a href="${WEB_CLUB}" style="color:#15803d;">cdbustarviejo.com</a></p>
    </div>
  </div>
</div>`;

export const buildEmailContent = ({ nombre, tipo, temporada, url }) => {
  const nombreCorto = (nombre || "").split(" ")[0] || "";
  const saludo = nombreCorto ? `Hola ${nombreCorto},` : "Hola,";

  if (tipo === "ex_socio") {
    return {
      subject: "Nos gustaría volver a contar contigo 🧡🖤",
      body: wrapEmail(
        "Nos gustaría volver a contar contigo",
        [
          saludo,
          "Nos ponemos en contacto contigo porque en algún momento formaste parte de la familia del <strong>C.D. Bustarviejo</strong> como socio/a.",
          "Y, aunque ahora ya no apareces como socio/a, queríamos escribirte personalmente.",
          `Estamos empezando una nueva temporada <strong>${temporada || ""}</strong> con muchas ganas, nuevos proyectos y mucha ilusión por seguir haciendo crecer nuestro club. Y nos gustaría que volvieras a formar parte de él.`,
          "La cuota de socio es de <strong>25 € al año</strong> y, aunque pueda parecer una pequeña aportación, para un club como el nuestro cada socio cuenta.",
          "Porque ser socio no es solamente pagar una cuota:<br>· Es apoyar al club que representa a nuestro pueblo.<br>· Es ayudar a nuestros equipos y a nuestros niños y niñas.<br>· Es participar, de alguna manera, en todo lo que estamos construyendo juntos.",
          "Si guardas un buen recuerdo del C.D. Bustarviejo, nos encantaría que volvieras a estar con nosotros. ❤️",
          "Gracias por haber formado parte de nuestra historia. Y ojalá podamos volver a contar contigo en la que estamos construyendo ahora.",
        ],
        url,
        "Quiero volver a ser socio/a"
      ),
    };
  }

  return {
    subject: "Ayúdanos a seguir creciendo: hazte socio del CD Bustarviejo 💚",
    body: wrapEmail(
      "Queremos seguir creciendo. Y nos vendría muy bien tu ayuda.",
      [
        saludo,
        "Te escribimos desde el <strong>Club Deportivo Bustarviejo</strong>. No te estamos vendiendo nada: te estamos pidiendo una mano.",
        `Esta temporada <strong>${temporada || ""}</strong> el club reúne a deportistas de todas las edades, desde los más pequeños hasta los equipos de adultos. Queremos seguir creciendo, incorporar nuevas disciplinas y traer más torneos al pueblo.`,
        "Somos una <strong>asociación sin ánimo de lucro</strong>: todo lo que entra se destina al club — equipaciones, fichas, arbitrajes, material, desplazamientos y actividades.",
        "Ser socio/a son <strong>25 € al año</strong>.",
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