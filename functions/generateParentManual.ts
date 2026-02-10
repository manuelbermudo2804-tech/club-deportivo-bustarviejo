import jsPDF from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const COLORS = {
  orange: { r: 249, g: 115, b: 22 },
  darkOrange: { r: 194, g: 65, b: 12 },
  darkGray: { r: 51, g: 65, b: 85 },
  lightGray: { r: 241, g: 245, b: 249 },
  green: { r: 34, g: 197, b: 94 },
  red: { r: 239, g: 68, b: 68 }
};

function createPDF() {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 20;

  // ===== PORTADA =====
  pdf.setFillColor(COLORS.orange.r, COLORS.orange.g, COLORS.orange.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(48);
  pdf.setTextColor(255, 255, 255);
  pdf.text('📱 MANUAL', pageWidth / 2, pageHeight / 3, { align: 'center' });
  pdf.text('CD BUSTARVIEJO', pageWidth / 2, pageHeight / 3 + 25, { align: 'center' });
  
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Guía Completa para Padres', pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text('Aprende a usar la app paso a paso', pageWidth / 2, pageHeight / 2 + 35, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`Actualizado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

  addNewPage();

  // ===== ÍNDICE =====
  y = 30;
  pdf.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text('📋 ÍNDICE', 20, y);
  
  y += 15;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  
  const sections = [
    '1. Introducción y primeros pasos',
    '2. Crear cuenta y login',
    '3. Mis jugadores',
    '4. Pagos de cuotas',
    '5. Compra de equipación',
    '6. Eventos y RSVP',
    '7. Chat con coordinadores',
    '8. Calendario y eventos',
    '9. Galería de fotos',
    '10. Certificados',
    '11. Mensajes y anuncios',
    '12. Mi perfil y configuración',
    '13. Preguntas frecuentes'
  ];

  sections.forEach(section => {
    pdf.text(section, 30, y);
    y += 8;
  });

  addNewPage();

  // ===== 1. INTRODUCCIÓN =====
  addSection('1️⃣ INTRODUCCIÓN Y PRIMEROS PASOS');
  addText('Bienvenido a la app oficial del CD Bustarviejo. Esta guía te ayudará a entender todas las funcionalidades disponibles para gestionar la inscripción de tus hijos, realizar pagos, confirmar asistencia a eventos y mantenerte comunicado con el club.');
  
  addSubsection('¿Qué puedes hacer en la app?');
  addBullet('✅ Registrar y gestionar a tus hijos jugadores');
  addBullet('✅ Realizar pagos de cuotas de forma segura');
  addBullet('✅ Comprar equipación y accesorios del club');
  addBullet('✅ Confirmar asistencia a partidos y eventos');
  addBullet('✅ Ver el calendario completo de eventos');
  addBullet('✅ Comunicarte directamente con coordinadores');
  addBullet('✅ Acceder a fotos de eventos');
  addBullet('✅ Descargar certificados de participación');

  addNewPage();

  // ===== 2. CREAR CUENTA =====
  addSection('2️⃣ CREAR CUENTA Y LOGIN');
  addText('El primer paso es crear tu cuenta o iniciar sesión si ya la tienes.');
  
  addSubsection('Paso 1: Ir a la pantalla de login');
  addText('Abre la app y verás la pantalla de inicio. Si no tienes cuenta, haz clic en "Crear cuenta".');
  
  addSubsection('Paso 2: Rellenar datos básicos');
  addBullet('Email: Tu correo principal (importante para recibir notificaciones)');
  addBullet('Contraseña: Crea una segura con números y mayúsculas');
  addBullet('Nombre: Tu nombre completo');
  
  addSubsection('Paso 3: Confirma tu email');
  addText('Recibirás un email de confirmación. Haz clic en el enlace para activar tu cuenta.');
  
  addSubsection('Paso 4: Completa tu perfil');
  addText('Rellena teléfono y dirección. Esta información es importante para contactos de emergencia.');

  addNewPage();

  // ===== 3. MIS JUGADORES =====
  addSection('3️⃣ MIS JUGADORES');
  addText('En esta sección verás todos tus hijos que están inscritos en el club y podrás gestionar su información.');
  
  addSubsection('Ver mis jugadores');
  addText('Desde el menú principal, entra en "Mis Jugadores". Verás una tarjeta para cada jugador con:');
  addBullet('📸 Foto de identificación');
  addBullet('👤 Nombre y edad');
  addBullet('⚽ Categoría (Benjamín, Alevín, etc)');
  addBullet('💳 Estado de pagos');
  addBullet('✅ Estado de inscripción');

  addSubsection('Información de cada jugador');
  addText('Haz clic en la tarjeta para ver detalles completos:');
  addBullet('📋 Documentos médicos');
  addBullet('📅 Historial de participación');
  addBullet('💾 Evaluaciones del entrenador');
  addBullet('🎯 Objetivos de temporada');

  addNewPage();

  // ===== 4. PAGOS =====
  addSection('4️⃣ PAGOS DE CUOTAS');
  addText('El sistema de pagos es seguro y fácil. Tienes varias opciones para pagar la inscripción.');
  
  addSubsection('Tipos de pago disponibles');
  addBullet('💳 Pago único: Paga toda la temporada de una vez');
  addBullet('📅 Pago en 3 cuotas: Divide en tres pagos (Junio, Septiembre, Diciembre)');
  addBullet('🔄 Plan personalizado: Consulta con el tesorero para opciones especiales');

  addSubsection('Cómo pagar por transferencia');
  addText('1. Entra en "Mis Pagos"');
  addText('2. Selecciona el jugador y el tipo de pago');
  addText('3. Haz la transferencia bancaria con el concepto que te indica');
  addText('4. Sube la captura o comprobante de pago en la app');
  addText('5. ¡Listo! El tesorero lo revisará y confirmará');

  addSubsection('Cómo pagar por tarjeta');
  addText('1. Entra en "Mis Pagos"');
  addText('2. Selecciona "Pagar por tarjeta"');
  addText('3. Haz clic en "Ir a checkout"');
  addText('4. Sigue los pasos de Stripe (plataforma segura de pagos)');
  addText('5. Confirma el pago - ¡Listo!');

  addSubsection('⚠️ Importante');
  addText('Los pagos por transferencia pueden tardar 1-2 días en confirmarse. Si pagas por tarjeta es inmediato.');

  addNewPage();

  // ===== 5. EQUIPACIÓN =====
  addSection('5️⃣ COMPRA DE EQUIPACIÓN');
  addText('Desde la app puedes comprar la ropa y accesorios oficiales del club cuando la tienda está abierta.');
  
  addSubsection('Acceder a la tienda');
  addText('1. Ve a "Tienda" en el menú');
  addText('2. Verás disponibles camisetas, pantalones, chaquetas, etc');
  addText('3. Selecciona los artículos y tu talla');
  addText('4. Añade al carrito');

  addSubsection('Proceso de compra');
  addText('1. Revisa tu carrito');
  addText('2. Selecciona método de pago (Transferencia o Bizum)');
  addText('3. Si es transferencia, sube el comprobante');
  addText('4. El administrador confirmará y entregará la ropa');

  addSubsection('Tallas disponibles');
  addText('Desde 4 años (6XS) hasta XXXL. Si no encuentras tu talla, contacta al coordinador.');

  addNewPage();

  // ===== 6. EVENTOS Y RSVP =====
  addSection('6️⃣ EVENTOS Y CONFIRMACIÓN DE ASISTENCIA');
  addText('Aquí confirmas si tu hijo asistirá a partidos, entrenamientos especiales, torneosevento, etc.');
  
  addSubsection('Ver eventos próximos');
  addText('1. Ve a "Eventos" o "Calendario"');
  addText('2. Verás todos los próximos eventos listados');
  addText('3. Cada evento muestra: fecha, hora, ubicación y rival');

  addSubsection('Confirmar asistencia (RSVP)');
  addText('1. Haz clic en un evento');
  addText('2. Elige "Asistiré", "No asistiré" o "Quizás"');
  addText('3. Puedes añadir comentarios si es necesario');
  addText('4. ¡Listo! El entrenador recibirá tu confirmación');

  addSubsection('Descargar evento al calendario');
  addText('1. Haz clic en el icono de descarga (📥)');
  addText('2. Se descargará un archivo .ics');
  addText('3. Ábrelo y añádelo a Google Calendar, Outlook, etc');
  addText('4. Recibirás recordatorios automáticos');

  addNewPage();

  // ===== 7. CHAT =====
  addSection('7️⃣ CHAT CON COORDINADORES');
  addText('Comunícate directamente con el coordinador de tu categoría para resolver dudas.');
  
  addSubsection('Acceder al chat');
  addText('1. Ve a "Chat" en el menú');
  addText('2. Selecciona la categoría de tu hijo');
  addText('3. Verás el chat con el coordinador y otros padres');

  addSubsection('Cómo usar el chat');
  addBullet('💬 Escribe mensajes en el campo inferior');
  addBullet('📎 Puedes adjuntar fotos o documentos');
  addBullet('📍 Puedes compartir tu ubicación');
  addBullet('⭐ Reacciona con emojis a mensajes');
  addBullet('📌 El coordinador puede fijar mensajes importantes');

  addSubsection('Consejos');
  addBullet('✅ Sé respetuoso y profesional');
  addBullet('✅ Evita mensajes fuera del horario laboral');
  addBullet('✅ Si es urgente, llama por teléfono');
  addBullet('✅ El coordinador intentará responder en 24h');

  addNewPage();

  // ===== 8. CALENDARIO =====
  addSection('8️⃣ CALENDARIO Y EVENTOS');
  addText('El calendario te muestra todos los eventos del club en una vista clara y organizada.');
  
  addSubsection('Ver calendario');
  addText('1. Ve a "Calendario"');
  addText('2. Verás una vista mensual con todos los eventos');
  addText('3. Los eventos están codificados por color:');
  addBullet('🟠 Naranja: Partidos');
  addBullet('🟢 Verde: Entrenamientos');
  addBullet('🔵 Azul: Torneos');
  addBullet('🟣 Violeta: Eventos del club');

  addSubsection('Cambiar vista');
  addBullet('📅 Vista mensual: Haz clic en el mes');
  addBullet('📋 Vista agenda: Lista de próximos eventos');
  addBullet('🗓️ Vista semana: Eventos de la semana actual');

  addNewPage();

  // ===== 9. GALERÍA =====
  addSection('9️⃣ GALERÍA DE FOTOS');
  addText('Revisa fotos de entrenamientos, partidos y eventos del club.');
  
  addSubsection('Acceder a la galería');
  addText('1. Ve a "Galería"');
  addText('2. Verás álbumes de diferentes eventos y fechas');
  addText('3. Haz clic en un álbum para ver todas las fotos');

  addSubsection('Funciones');
  addBullet('🔍 Zoom: Toca la foto para ampliar');
  addBullet('⬅️➡️ Navegar: Desliza para ver otras fotos');
  addBullet('💾 Descargar: Guarda las fotos a tu teléfono');
  addBullet('📱 Compartir: Envía por WhatsApp, email, etc');

  addNewPage();

  // ===== 10. CERTIFICADOS =====
  addSection('🔟 CERTIFICADOS');
  addText('Descarga certificados oficiales de participación e inscripción.');
  
  addSubsection('Tipos de certificados');
  addBullet('📜 Inscripción: Verifica que tu hijo está inscrito');
  addBullet('✅ Pagos al día: Comprueba que todo está pagado');
  addBullet('⚽ Participación: Por haber jugado en la temporada');
  addBullet('🏆 Participación en torneo: Por competiciones especiales');

  addSubsection('Cómo solicitarlos');
  addText('1. Ve a "Mis Jugadores"');
  addText('2. Selecciona un jugador');
  addText('3. Busca "Certificados"');
  addText('4. Elige el tipo que necesitas');
  addText('5. Se descargará como PDF con código de verificación');

  addSubsection('Códigos de verificación');
  addText('Cada certificado tiene un código único que el club puede verificar para comprobar su autenticidad.');

  addNewPage();

  // ===== 11. MENSAJES Y ANUNCIOS =====
  addSection('1️⃣1️⃣ MENSAJES Y ANUNCIOS');
  addText('Recibe avisos importantes del club sobre eventos, cambios y noticias.');
  
  addSubsection('Centro de notificaciones');
  addText('1. Ve a "Notificaciones"');
  addText('2. Verás anuncios importantes en rojo (Urgentes)');
  addText('3. Anuncios normales en naranja');
  addText('4. Información general en azul');

  addSubsection('Tipos de anuncios');
  addBullet('📌 Anclados: Están fijados arriba (muy importantes)');
  addBullet('🔔 Nuevos: Acababan de publicarse');
  addBullet('⏰ Expirados: Ya no están vigentes');

  addSubsection('Preferencias de notificaciones');
  addText('1. Ve a "Mi Perfil" > "Ajustes"');
  addText('2. Selecciona qué notificaciones quieres recibir');
  addText('3. Elige entre Push (en el móvil) y Email');

  addNewPage();

  // ===== 12. PERFIL =====
  addSection('1️⃣2️⃣ MI PERFIL Y CONFIGURACIÓN');
  addText('Gestiona tu información personal y las preferencias de la app.');
  
  addSubsection('Datos personales');
  addText('1. Ve a "Mi Perfil"');
  addText('2. Puedes editar:');
  addBullet('👤 Nombre');
  addBullet('📱 Teléfono');
  addBullet('📧 Email');
  addBullet('📍 Dirección');

  addSubsection('Cambiar contraseña');
  addText('1. Ve a "Seguridad"');
  addText('2. Haz clic en "Cambiar contraseña"');
  addText('3. Introduce la actual y la nueva');
  addText('4. Confirma con email si es necesario');

  addSubsection('Tema oscuro/claro');
  addText('1. Ve a "Ajustes"');
  addText('2. Selecciona tema claro u oscuro');
  addText('3. Se guardará automáticamente');

  addNewPage();

  // ===== 13. FAQ =====
  addSection('1️⃣3️⃣ PREGUNTAS FRECUENTES');
  
  addSubsection('¿Cuáles son los horarios de atención?');
  addText('El coordinador atiende mensajes en horario laboral (9:00-18:00 L-V). En caso de emergencia, llama por teléfono.');

  addSubsection('¿Cómo cambio el segundo progenitor?');
  addText('Ve a "Mis Jugadores", entra en el jugador y busca "Segundo progenitor". Puedes añadir o cambiar el email del otro padre.');

  addSubsection('¿Qué hago si olvido la contraseña?');
  addText('En la pantalla de login, haz clic en "¿Olvidaste la contraseña?". Te enviaremos un email para resetearla.');

  addSubsection('¿Cómo cancelo una confirmación de evento?');
  addText('Ve al evento, haz clic de nuevo y cambia de "Asistiré" a "No asistiré". Los cambios se guardan inmediatamente.');

  addSubsection('¿Puedo ver el historial de pagos?');
  addText('Sí, ve a "Mis Pagos" > "Historial". Allí verás todos los pagos realizados con fechas y comprobantes.');

  addSubsection('¿Cómo reporto un problema?');
  addText('Ve a "Ayuda" > "Reportar un problema". Describe el problema y adjunta capturas si es necesario.');

  addSubsection('¿Los datos están seguros?');
  addText('Sí, usamos encriptación SSL (https) y cumplimos RGPD. Los datos de menores están totalmente protegidos.');

  addSubsection('¿Puedo eliminar mi cuenta?');
  addText('Ve a "Mi Perfil" > "Eliminar cuenta". Se borrarán todos tus datos (esto no se puede deshacer).');

  // Última página
  addNewPage();
  
  pdf.setFillColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  pdf.text('¡GRACIAS POR SER PARTE', pageWidth / 2, pageHeight / 3, { align: 'center' });
  pdf.text('DEL CD BUSTARVIEJO!', pageWidth / 2, pageHeight / 3 + 20, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text('Si tienes dudas, contacta con el coordinador de tu categoría', pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
  pdf.text('o envía un email a: info@cdbustarviejo.es', pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  
  pdf.setFontSize(11);
  pdf.setTextColor(COLORS.orange.r, COLORS.orange.g, COLORS.orange.b);
  pdf.text('¡Esperamos verte pronto!', pageWidth / 2, pageHeight - 50, { align: 'center' });

  function addNewPage() {
    pdf.addPage();
    y = 20;
  }

  function addSection(title) {
    pdf.setFillColor(COLORS.orange.r, COLORS.orange.g, COLORS.orange.b);
    pdf.rect(10, y - 5, pageWidth - 20, 12, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, 20, y + 2);
    pdf.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
    y += 20;
  }

  function addSubsection(title) {
    if (y > pageHeight - 40) addNewPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(COLORS.darkOrange.r, COLORS.darkOrange.g, COLORS.darkOrange.b);
    pdf.text(title, 20, y);
    y += 8;
  }

  function addText(text) {
    if (y > pageHeight - 30) addNewPage();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
    const lines = pdf.splitTextToSize(text, pageWidth - 40);
    pdf.text(lines, 20, y);
    y += lines.length * 5 + 3;
  }

  function addBullet(text) {
    if (y > pageHeight - 30) addNewPage();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
    const lines = pdf.splitTextToSize(text, pageWidth - 50);
    pdf.text(lines, 25, y);
    y += lines.length * 5 + 2;
  }

  return pdf.output('arraybuffer');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pdfBuffer = createPDF();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=Manual_Padres_CD_Bustarviejo.pdf',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error generating manual:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});