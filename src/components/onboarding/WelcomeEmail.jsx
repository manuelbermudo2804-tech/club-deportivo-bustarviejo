// Plantilla de email de bienvenida para copiar/pegar o enviar automáticamente

export const welcomeEmailTemplate = (userName, userRole, loginUrl) => {
  const roleMessages = {
    padre: {
      title: "👨‍👩‍👧 Bienvenido a la Familia del CD Bustarviejo",
      content: `
        <p>Estimado/a <strong>${userName}</strong>,</p>
        <p>¡Bienvenido/a a la aplicación oficial del CD Bustarviejo! Nos alegra tenerte en nuestra familia deportiva.</p>
        
        <h3 style="color: #ea580c; margin-top: 20px;">¿Qué puedes hacer en la app?</h3>
        <ul style="line-height: 1.8;">
          <li>📅 <strong>Ver el calendario</strong> de partidos y eventos</li>
          <li>🏆 <strong>Confirmar asistencia</strong> a convocatorias</li>
          <li>💰 <strong>Gestionar pagos</strong> y subir justificantes</li>
          <li>💬 <strong>Chatear</strong> con entrenadores y recibir anuncios</li>
          <li>🛍️ <strong>Pedir equipación</strong> para tus hijos</li>
          <li>📸 <strong>Ver fotos</strong> de la galería del club</li>
        </ul>

        <h3 style="color: #ea580c; margin-top: 20px;">Primeros Pasos:</h3>
        <ol style="line-height: 1.8;">
          <li>Accede a la app con tu email y contraseña</li>
          <li>Verifica los datos de tus hijos</li>
          <li>Activa las notificaciones en tu móvil</li>
          <li>Explora el calendario y las convocatorias</li>
        </ol>
      `
    },
    entrenador: {
      title: "⚽ Bienvenido al Panel de Entrenadores",
      content: `
        <p>Estimado/a <strong>${userName}</strong>,</p>
        <p>¡Bienvenido/a al panel de entrenadores del CD Bustarviejo!</p>
        
        <h3 style="color: #ea580c; margin-top: 20px;">Tus Herramientas:</h3>
        <ul style="line-height: 1.8;">
          <li>👥 <strong>Plantillas</strong> - Gestiona tu equipo</li>
          <li>📋 <strong>Asistencia</strong> - Pasa lista en entrenamientos</li>
          <li>⭐ <strong>Evaluaciones</strong> - Evalúa a tus jugadores</li>
          <li>🎓 <strong>Convocatorias</strong> - Crea listas para partidos</li>
          <li>💬 <strong>Chat</strong> - Comunícate con las familias</li>
          <li>📅 <strong>Calendario</strong> - Consulta horarios y partidos</li>
        </ul>

        <h3 style="color: #ea580c; margin-top: 20px;">Primeros Pasos:</h3>
        <ol style="line-height: 1.8;">
          <li>Revisa tu plantilla de jugadores</li>
          <li>Configura los horarios de entrenamiento</li>
          <li>Crea tu primera convocatoria</li>
          <li>Familiarízate con el sistema de asistencia</li>
        </ol>
      `
    },
    coordinador: {
      title: "🎓 Bienvenido al Panel de Coordinación",
      content: `
        <p>Estimado/a <strong>${userName}</strong>,</p>
        <p>¡Bienvenido/a al panel de coordinación deportiva del CD Bustarviejo!</p>
        
        <h3 style="color: #ea580c; margin-top: 20px;">Tu Panel de Control:</h3>
        <ul style="line-height: 1.8;">
          <li>👥 <strong>Todas las Plantillas</strong> - Vista global de equipos</li>
          <li>📊 <strong>Reportes</strong> - Estadísticas de asistencia y evaluaciones</li>
          <li>📅 <strong>Calendario Maestro</strong> - Todos los eventos del club</li>
          <li>⚙️ <strong>Gestión</strong> - Coordina entrenadores y categorías</li>
          <li>💬 <strong>Comunicación</strong> - Canal directo con entrenadores</li>
        </ul>

        <h3 style="color: #ea580c; margin-top: 20px;">Responsabilidades:</h3>
        <ol style="line-height: 1.8;">
          <li>Supervisar el trabajo de los entrenadores</li>
          <li>Revisar reportes de evaluación</li>
          <li>Coordinar horarios y eventos</li>
          <li>Apoyar la comunicación entre entrenadores</li>
        </ol>
      `
    },
    admin: {
      title: "👑 Bienvenido al Panel de Administración",
      content: `
        <p>Estimado/a <strong>${userName}</strong>,</p>
        <p>¡Bienvenido/a al panel de administración completo del CD Bustarviejo!</p>
        
        <h3 style="color: #ea580c; margin-top: 20px;">Control Total:</h3>
        <ul style="line-height: 1.8;">
          <li>👥 <strong>Gestión de Jugadores</strong> - Altas, bajas, renovaciones</li>
          <li>💰 <strong>Pagos y Recordatorios</strong> - Control financiero</li>
          <li>📅 <strong>Calendario y Eventos</strong> - Gestión completa</li>
          <li>📢 <strong>Anuncios</strong> - Comunicación masiva</li>
          <li>🛍️ <strong>Pedidos de Ropa</strong> - Gestión de equipación</li>
          <li>📊 <strong>Estadísticas</strong> - Vista global del club</li>
          <li>⚙️ <strong>Temporadas</strong> - Reinicio anual y configuración</li>
        </ul>

        <h3 style="color: #ea580c; margin-top: 20px;">Importante:</h3>
        <ol style="line-height: 1.8;">
          <li>Revisa la configuración de la temporada actual</li>
          <li>Configura las cuotas y categorías</li>
          <li>Invita a las familias y entrenadores</li>
          <li>Activa recordatorios automáticos</li>
        </ol>
      `
    }
  };

  const roleContent = roleMessages[userRole] || roleMessages.padre;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    .content {
      background: #f8fafc;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      color: white !important;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      padding: 20px;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 25px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚽</div>
    <h1 style="margin: 0; font-size: 24px;">${roleContent.title}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">CD Bustarviejo - Fundado en 1989</p>
  </div>

  <div class="content">
    ${roleContent.content}
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${loginUrl}" class="button">
        🚀 Acceder a la Aplicación
      </a>
    </div>
  </div>

  <div class="footer">
    <p><strong>¿Necesitas ayuda?</strong></p>
    <p>📧 CDBUSTARVIEJO@GMAIL.COM</p>
    <p style="margin-top: 20px; font-size: 12px;">
      Este email ha sido enviado por el CD Bustarviejo<br>
      © 2025 CD Bustarviejo - Todos los derechos reservados
    </p>
  </div>
</body>
</html>
  `;
};