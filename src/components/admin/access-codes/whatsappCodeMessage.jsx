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

function buildWhatsAppCodeMessage(tipo, nombre, codigo, email) {
  const firstName = nombre ? nombre.split(' ')[0] : '';
  const saludo = firstName ? `¡Hola ${firstName}! 👋` : '¡Hola! 👋';
  const appUrl = 'https://app.cdbustarviejo.com';
  const emailNote = email ? `\n\n⚠️ *MUY IMPORTANTE:* Tienes que registrarte con exactamente este email: *${email}*\nSi usas otro email diferente, el código *no funcionará*.` : `\n\n⚠️ *Importante:* Regístrate con el *mismo email* al que te enviamos esta invitación. Si usas otro, el código no funcionará.`;

  const installSteps = `*PASO 1 — Instala la app en tu móvil:*
🤖 *Android (Chrome):* Abre este enlace → ${appUrl} → Pulsa los *3 puntos* (⋮) arriba a la derecha → *"Instalar aplicación"* o *"Añadir a pantalla de inicio"*
🍎 *iPhone (Safari):* Abre Safari → Escribe *app.cdbustarviejo.com* → Pulsa el botón *Compartir* (↑) → *"Añadir a pantalla de inicio"*`;

  if (tipo === 'padre_nuevo' || tipo === 'jugador_adulto') {
    const rolLabel = tipo === 'jugador_adulto' ? 'jugador/a' : 'padre/madre/tutor';
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Ya tienes tu *código de acceso* para entrar en la app del club como ${rolLabel}.

📲 *Tu código:*  \`${codigo}\`

*Cómo activarlo (2 minutos):*

${installSteps}

*PASO 2 — Crea tu cuenta:*
1️⃣ Abre la app desde el icono que acabas de instalar
2️⃣ Pulsa *"Crear cuenta"*
3️⃣ Introduce el código de arriba cuando te lo pida
4️⃣ *¡Listo!* Ya tienes acceso completo 🎉
${emailNote}

⏰ El código es válido durante *7 días*.

¿Algún problema? Respóndenos por aquí y te ayudamos 💬`;
  }

  if (tipo === 'segundo_progenitor') {
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

El otro progenitor/tutor te ha dado acceso a la *app del club* para que tú también puedas seguir las actividades deportivas de vuestros hijos.

📲 *Tu código de acceso:*  \`${codigo}\`

*Cómo activarlo:*

${installSteps}

*PASO 2 — Crea tu cuenta:*
1️⃣ Abre la app → Pulsa *"Crear cuenta"*
2️⃣ Introduce el código cuando te lo pida
3️⃣ *¡Listo!* Ambos progenitores tendréis acceso independiente 🎉
${emailNote}

⏰ Código válido *7 días*.

¿Dudas? Respóndenos aquí 💬`;
  }

  if (tipo === 'juvenil') {
    return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Tu padre/madre/tutor te ha autorizado para tener *tu propio acceso* a la app del club. ¡Ya puedes ver tus convocatorias, resultados y mucho más!

📲 *Tu código:*  \`${codigo}\`

*Cómo entrar:*

${installSteps}

*PASO 2 — Crea tu cuenta:*
1️⃣ Abre la app → Pulsa *"Crear cuenta"*
2️⃣ Introduce el código
3️⃣ *¡A disfrutar!* 🎉
${emailNote}

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

${installSteps}

*PASO 2 — Crea tu cuenta:*
1️⃣ Abre la app → Pulsa *"Crear cuenta"*
2️⃣ Introduce el código
3️⃣ *¡Listo!* Tendrás acceso directo al panel de ${rolLabel.toLowerCase()} 🎉
${emailNote}

⏰ Código válido *7 días*.

¿Dudas? Respóndenos aquí 💬`;
  }

  // Fallback genérico
  return `${saludo}

Te escribimos desde el *CD Bustarviejo* ⚽🟠

Tu *código de acceso* a la app del club es:

📲 \`${codigo}\`

${installSteps}

Abre la app y usa este código para entrar.
${emailNote}

¿Problemas? Respóndenos aquí 💬`;
}

function getWhatsAppUrl(telefono, tipo, nombre, codigo, email) {
  const phone = normalizePhone(telefono);
  if (!phone) return null;
  const message = buildWhatsAppCodeMessage(tipo, nombre, codigo, email);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export { normalizePhone, buildWhatsAppCodeMessage, getWhatsAppUrl };