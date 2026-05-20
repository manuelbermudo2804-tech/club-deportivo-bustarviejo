/**
 * Genera el mensaje de WhatsApp con el código de acceso,
 * adaptado al tipo de invitación (igual que el email pero en texto plano para WhatsApp).
 */

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 9) return digits;
  if (digits.length === 9) return `34${digits}`;
  return digits;
}

function buildWhatsAppCodeMessage(tipo, nombre, codigo) {
  const firstName = nombre ? nombre.split(' ')[0] : '';
  const saludo = firstName ? `¡Hola ${firstName}! 👋` : '¡Hola! 👋';
  const appUrl = 'https://app.cdbustarviejo.com';

  if (tipo === 'padre_nuevo' || tipo === 'jugador_adulto') {
    const rolLabel = tipo === 'jugador_adulto' ? 'jugador/a' : 'padre/madre/tutor';
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Ya tienes tu *código de acceso* para entrar en la app del club como ${rolLabel}.

📲 *Tu código:*  \`${codigo}\`

*Cómo activarlo (2 minutos):*

*PASO 1 — Instala la app:*
🤖 *Android:* Abre este enlace en Chrome → ${appUrl}
🍎 *iPhone:* Abre Safari, escribe *app.cdbustarviejo.com*, pulsa Compartir (↑) → "Añadir a pantalla de inicio"

*PASO 2 — Crea tu cuenta:*
1️⃣ Abre la app desde el icono que acabas de instalar
2️⃣ Pulsa *"Crear cuenta"* y regístrate con *este mismo email* al que te hemos escrito
3️⃣ Introduce el código de arriba cuando te lo pida
4️⃣ *¡Listo!* Ya tienes acceso completo 🎉

⚠️ *Importante:* Regístrate con el *mismo email* al que te enviamos esta invitación. Si usas otro, el código no funcionará.

⏰ El código es válido durante *7 días*.

¿Algún problema? Respóndenos por aquí y te ayudamos 💬`;
  }

  if (tipo === 'segundo_progenitor') {
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

El otro progenitor/tutor te ha dado acceso a la *app del club* para que tú también puedas seguir las actividades deportivas de vuestros hijos.

📲 *Tu código de acceso:*  \`${codigo}\`

*Cómo activarlo:*
1️⃣ Instala la app: abre *${appUrl}* en Chrome (Android) o Safari (iPhone) y añádela a tu pantalla de inicio
2️⃣ Pulsa *"Crear cuenta"* y usa *este email*
3️⃣ Introduce el código cuando te lo pida
4️⃣ *¡Listo!* Ambos progenitores tendréis acceso independiente 🎉

⚠️ Usa *este mismo email* para registrarte.
⏰ Código válido *7 días*.

¿Dudas? Respóndenos aquí 💬`;
  }

  if (tipo === 'juvenil') {
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Tu padre/madre/tutor te ha autorizado para tener *tu propio acceso* a la app del club. ¡Ya puedes ver tus convocatorias, resultados y mucho más!

📲 *Tu código:*  \`${codigo}\`

*Cómo entrar:*
1️⃣ Instala la app: abre *${appUrl}* en tu móvil
2️⃣ Crea tu cuenta con *este email*
3️⃣ Introduce el código
4️⃣ *¡A disfrutar!* 🎉

⚠️ Usa *este email* para registrarte.
⏰ Código válido *7 días*.

¿Problemas? Díselo a tu padre/madre o respóndenos aquí 💬`;
  }

  if (tipo === 'entrenador' || tipo === 'coordinador') {
    const rolLabel = tipo === 'entrenador' ? 'Entrenador' : 'Coordinador';
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Has sido invitado/a como *${rolLabel}* a la app del club. Desde aquí podrás gestionar convocatorias, asistencia, comunicarte con las familias y mucho más.

📲 *Tu código:*  \`${codigo}\`

*Cómo activarlo:*
1️⃣ Instala la app: *${appUrl}*
2️⃣ Crea tu cuenta con *este email*
3️⃣ Introduce el código
4️⃣ *¡Listo!* Tendrás acceso directo al panel de ${rolLabel.toLowerCase()} 🎉

⚠️ Usa *este email* para registrarte.
⏰ Código válido *7 días*.

¿Dudas? Respóndenos aquí 💬`;
  }

  // Fallback genérico
  return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Tu *código de acceso* a la app del club es:

📲 \`${codigo}\`

Instala la app desde *${appUrl}* y usa este código para entrar.

¿Problemas? Respóndenos aquí 💬`;
}

function getWhatsAppUrl(telefono, tipo, nombre, codigo) {
  const phone = normalizePhone(telefono);
  if (!phone) return null;
  const message = buildWhatsAppCodeMessage(tipo, nombre, codigo);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export { normalizePhone, buildWhatsAppCodeMessage, getWhatsAppUrl };