// Mensajes precargados para contactar a los resultados del cotejo.
// tipo: 'ex_socio' (fue socio y no ha renovado) | 'nuevo' (nunca ha sido socio)

const firma = "CD Bustarviejo\ninfo@clubdeportivobustarviejo.com";

export const buildWhatsAppMessage = ({ nombre, tipo, temporada, url }) => {
  const saludo = `¡Hola ${nombre || ""}! 👋`;
  if (tipo === "ex_socio") {
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* 💚⚽

Hemos visto que aún no has renovado tu carnet de socio para la temporada *${temporada || ""}*.

🎉 *Renovar cuesta solo 25€/año* y con ello sigues apoyando a más de 200 jóvenes deportistas del pueblo.

Puedes hacerlo aquí en 1 minuto:
${url}

¡Gracias por seguir con nosotros! 🙏`;
  }
  return `${saludo}

Te escribimos desde el *CD Bustarviejo* 💚⚽

Estamos abriendo el *carnet de socio* de la temporada *${temporada || ""}* y nos encantaría contar contigo.

Por solo *25€/año* apoyas directamente al deporte base de Bustarviejo y disfrutas de las ventajas de socio.

Puedes darte de alta aquí en 1 minuto:
${url}

¡Gracias por tu apoyo! 🙏`;
};

export const buildEmailContent = ({ nombre, tipo, temporada, url }) => {
  if (tipo === "ex_socio") {
    return {
      subject: "💚 ¡Te echamos de menos! Renueva tu carnet de socio",
      body: `Estimado/a ${nombre || ""},

Hemos visto que aún no has renovado tu carnet de socio del CD Bustarviejo para la temporada ${temporada || ""}.

Por solo 25€ al año seguirás apoyando a más de 200 jóvenes deportistas de Bustarviejo.

Puedes renovar aquí en un minuto:
${url}

Si tienes cualquier duda, escríbenos a info@clubdeportivobustarviejo.com y te ayudamos.

Un cordial saludo,
${firma}`,
    };
  }
  return {
    subject: "💚 Hazte socio del CD Bustarviejo",
    body: `Estimado/a ${nombre || ""},

Te escribimos desde el CD Bustarviejo. Estamos abriendo el carnet de socio de la temporada ${temporada || ""} y nos encantaría contar contigo.

Por solo 25€ al año apoyas directamente al deporte base del pueblo y disfrutas de las ventajas de socio.

Puedes darte de alta aquí en un minuto:
${url}

Si tienes cualquier duda, escríbenos a info@clubdeportivobustarviejo.com y te ayudamos.

Un cordial saludo,
${firma}`,
  };
};

export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 9) cleaned = "34" + cleaned;
  return cleaned.length >= 11 ? cleaned : null;
};