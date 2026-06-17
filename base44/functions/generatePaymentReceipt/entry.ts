import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

// Carga una imagen remota como dataURL para incrustarla en el PDF
const loadImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn('No se pudo cargar imagen:', url, e);
    return null;
  }
};

const numeroALetras = (num) => {
  const n = parseFloat(String(num).replace(',', '.'));
  if (isNaN(n)) return '';
  const entero = Math.floor(n);
  const decimal = Math.round((n - entero) * 100);
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const conv = (num) => {
    if (num === 0) return 'cero';
    if (num === 100) return 'cien';
    if (num <= 20) return unidades[num];
    if (num < 100) { const d = Math.floor(num / 10), u = num % 10; if (num < 30) return 'veinti' + unidades[u]; return decenas[d] + (u ? ' y ' + unidades[u] : ''); }
    if (num < 1000) { const c = Math.floor(num / 100), r = num % 100; return centenas[c] + (r ? ' ' + conv(r) : ''); }
    if (num < 1000000) { const m = Math.floor(num / 1000), r = num % 1000; return (m === 1 ? 'mil' : conv(m) + ' mil') + (r ? ' ' + conv(r) : ''); }
    return String(num);
  };
  let r = conv(entero) + ' euros';
  if (decimal > 0) r += ' con ' + conv(decimal) + ' céntimos';
  return r.charAt(0).toUpperCase() + r.slice(1);
};

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const formatFechaLarga = (fechaStr) => {
  try {
    const d = new Date(fechaStr);
    return `${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`;
  } catch {
    return '';
  }
};

// Construye el recibo "bonito" (marco, marca de agua, sello y firma) reutilizando el diseño de patrocinio
const buildReciboPDF = async ({ numero, fecha, recibiDe, cantidad, concepto, temporada, lugar, logoUrl, selloUrl, firmaUrl }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const marginX = 20;

  // Marco decorativo
  doc.setDrawColor(251, 146, 60);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageW - 24, pageH - 24);
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(1.2);
  doc.rect(15, 15, pageW - 30, pageH - 30);
  doc.setDrawColor(194, 65, 12);
  doc.setLineWidth(1.5);
  const cs = 8;
  doc.line(15, 15 + cs, 15, 15); doc.line(15, 15, 15 + cs, 15);
  doc.line(pageW - 15 - cs, 15, pageW - 15, 15); doc.line(pageW - 15, 15, pageW - 15, 15 + cs);
  doc.line(15, pageH - 15 - cs, 15, pageH - 15); doc.line(15, pageH - 15, 15 + cs, pageH - 15);
  doc.line(pageW - 15 - cs, pageH - 15, pageW - 15, pageH - 15); doc.line(pageW - 15, pageH - 15 - cs, pageW - 15, pageH - 15);

  // Header (logo del club, sin marca de agua pesada para no agotar CPU)
  const logoData = await loadImageAsDataUrl(logoUrl);
  if (logoData) { try { doc.addImage(logoData, 'JPEG', marginX + 5, 22, 22, 22, undefined, 'FAST'); } catch { try { doc.addImage(logoData, 'PNG', marginX + 5, 22, 22, 22, undefined, 'FAST'); } catch {} } }
  doc.setFont('times', 'bold'); doc.setFontSize(20); doc.setTextColor(15, 23, 42);
  doc.text('CD BUSTARVIEJO', marginX + 32, 30);
  doc.setFont('times', 'italic'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('Club Deportivo · Bustarviejo · Madrid', marginX + 32, 36);

  // Caja Nº recibo
  doc.setFillColor(255, 247, 237); doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.5);
  doc.roundedRect(pageW - marginX - 38, 22, 33, 22, 2, 2, 'FD');
  doc.setFont('times', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
  doc.text('RECIBO Nº', pageW - marginX - 21.5, 28, { align: 'center' });
  doc.setFont('times', 'bold'); doc.setFontSize(10); doc.setTextColor(234, 88, 12);
  doc.text(String(numero || '—'), pageW - marginX - 21.5, 34, { align: 'center' });
  const fechaFmt = formatFechaLarga(fecha) || '____ de __________ de ______';
  doc.setFont('times', 'italic'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
  doc.text(fechaFmt, pageW - marginX - 21.5, 41.5, { align: 'center' });

  // Separador
  doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.6);
  doc.line(marginX, 55, pageW / 2 - 4, 55); doc.line(pageW / 2 + 4, 55, pageW - marginX, 55);
  doc.setFillColor(234, 88, 12); doc.circle(pageW / 2, 55, 1.2, 'F');

  // Título
  doc.setFont('times', 'bold'); doc.setFontSize(32); doc.setTextColor(30, 41, 59);
  doc.text('R E C I B Í', pageW / 2, 75, { align: 'center' });
  doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.8);
  doc.line(pageW / 2 - 12, 79, pageW / 2 + 12, 79);

  let y = 100;
  const miniLabel = (label, yPos) => { doc.setFont('times', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text(label.toUpperCase(), marginX, yPos); };
  const dottedLine = (yPos) => { doc.setLineDashPattern([0.5, 1], 0); doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.line(marginX, yPos, pageW - marginX, yPos); doc.setLineDashPattern([], 0); };

  // Recibí de
  miniLabel('Recibí de', y); y += 6;
  doc.setFont('times', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 23, 42);
  doc.text(String(recibiDe || ''), marginX, y);
  dottedLine(y + 1.5); y += 12;

  // Cantidad
  miniLabel('La cantidad de', y); y += 7;
  doc.setFont('times', 'bold'); doc.setFontSize(28); doc.setTextColor(194, 65, 12);
  doc.text(cantidad ? `${cantidad} €` : '________ €', marginX, y);
  y += 2; dottedLine(y); y += 5;
  if (cantidad) { doc.setFont('times', 'italic'); doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`(${numeroALetras(cantidad)})`, marginX, y); y += 10; } else { y += 5; }

  // Concepto
  miniLabel('En concepto de', y); y += 6;
  doc.setFont('times', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  const conceptoCompleto = (concepto || '') + (temporada ? `  ·  Temporada ${temporada}` : '');
  const conceptoLines = doc.splitTextToSize(conceptoCompleto, pageW - marginX * 2);
  doc.text(conceptoLines, marginX, y);
  y += conceptoLines.length * 6 + 1; dottedLine(y);

  // Lugar y fecha
  y += 25;
  doc.setFont('times', 'italic'); doc.setFontSize(11); doc.setTextColor(71, 85, 105);
  doc.text('En ', marginX, y);
  doc.setFont('times', 'bold'); doc.setTextColor(15, 23, 42); doc.text(lugar || 'Bustarviejo', marginX + 8, y);
  const lugarW = doc.getTextWidth(lugar || 'Bustarviejo');
  doc.setFont('times', 'italic'); doc.setTextColor(71, 85, 105); doc.text(', a ', marginX + 8 + lugarW, y);
  doc.setFont('times', 'bold'); doc.setTextColor(15, 23, 42); doc.text(fechaFmt + '.', marginX + 8 + lugarW + 6, y);

  // Firma y sello
  y += 35;
  if (firmaUrl) {
    const firmaData = await loadImageAsDataUrl(firmaUrl);
    if (firmaData) { try { doc.addImage(firmaData, 'PNG', marginX + 12, y - 22, 55, 22, undefined, 'FAST'); } catch { try { doc.addImage(firmaData, 'JPEG', marginX + 12, y - 22, 55, 22, undefined, 'FAST'); } catch {} } }
  }
  doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.5); doc.line(marginX, y, marginX + 80, y);
  doc.setFont('times', 'bold'); doc.setFontSize(8); doc.setTextColor(194, 65, 12);
  doc.text('EL PRESIDENTE', marginX + 40, y + 4.5, { align: 'center' });
  doc.setFont('times', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
  doc.text('Manuel Bermudo Santacruz', marginX + 40, y + 10, { align: 'center' });
  doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('DNI: 51404895X', marginX + 40, y + 15, { align: 'center' });
  if (selloUrl) {
    const selloData = await loadImageAsDataUrl(selloUrl);
    if (selloData) { try { doc.addImage(selloData, 'PNG', pageW - marginX - 50, y - 30, 48, 48, undefined, 'FAST'); } catch { try { doc.addImage(selloData, 'JPEG', pageW - marginX - 50, y - 30, 48, 48, undefined, 'FAST'); } catch {} } }
  }

  // Pie
  doc.setFont('times', 'italic'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text('CD Bustarviejo · cdbustarviejo@gmail.com · Bustarviejo, Madrid', pageW / 2, pageH - 22, { align: 'center' });

  return doc;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // No verificar usuario - esto se llama automáticamente cuando se marca como Pagado
    const { paymentId } = await req.json();
    
    if (!paymentId) {
      return Response.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    console.log('📄 [generatePaymentReceipt] Iniciando para paymentId:', paymentId);
    
    // Obtener el pago directamente
    const payment = await base44.asServiceRole.entities.Payment.get(paymentId);
    if (!payment) {
      console.error('❌ [generatePaymentReceipt] Pago no encontrado:', paymentId);
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }
    console.log('✅ [generatePaymentReceipt] Pago encontrado:', payment.jugador_nombre);

    // Obtener el jugador
    const player = await base44.asServiceRole.entities.Player.get(payment.jugador_id);
    if (!player) {
      console.error('❌ [generatePaymentReceipt] Jugador no encontrado:', payment.jugador_id);
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }
    console.log('✅ [generatePaymentReceipt] Jugador encontrado:', player.nombre);

    // Obtener la configuración de la temporada
    const configs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = configs.find(c => c.activa === true);
    console.log('✅ [generatePaymentReceipt] Config encontrada:', activeConfig?.temporada);

    // Obtener logo, sello y firma del club (compartidos en BrandingAssets)
    const CLUB_LOGO_DEFAULT = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';
    let branding = {};
    try {
      const brandingItems = await base44.asServiceRole.entities.BrandingAssets.list();
      branding = brandingItems?.[0] || {};
    } catch (e) { console.warn('No se pudo cargar BrandingAssets:', e); }

    // Concepto legible de la cuota
    const conceptoRecibo = `Cuota ${payment.mes} · ${player.nombre} (${player.deporte || 'Deportiva'})`;
    const recibiDe = player.nombre_tutor_legal || (player.email_padre ? `Tutor/a de ${player.nombre}` : player.nombre);

    // Número de recibo limpio y correlativo por temporada (ej: 2025/2026-0001)
    // Si el pago ya tiene un número asignado, reutilizarlo (para no cambiarlo al regenerar)
    let numeroRecibo = payment.numero_recibo;
    if (!numeroRecibo) {
      const temporadaPago = payment.temporada || 'S/T';
      const pagosTemporada = await base44.asServiceRole.entities.Payment.filter({ temporada: temporadaPago });
      const yaAsignados = pagosTemporada.filter(p => p.numero_recibo).length;
      const correlativo = String(yaAsignados + 1).padStart(4, '0');
      numeroRecibo = `${temporadaPago}-${correlativo}`;
      // Persistir el número en el pago para que sea estable
      await base44.asServiceRole.entities.Payment.update(paymentId, { numero_recibo: numeroRecibo });
    }

    // Generar el recibo profesional (marco, marca de agua, sello y firma del presidente)
    const doc = await buildReciboPDF({
      numero: numeroRecibo,
      fecha: payment.fecha_pago || payment.created_date,
      recibiDe,
      cantidad: Number(payment.cantidad).toFixed(2),
      concepto: conceptoRecibo,
      temporada: payment.temporada,
      lugar: 'Bustarviejo',
      logoUrl: branding.logo_url || CLUB_LOGO_DEFAULT,
      selloUrl: branding.sello_url || '',
      firmaUrl: branding.firma_url || '',
    });

    console.log('📝 [generatePaymentReceipt] PDF generado, subiendo a almacenamiento...');
    
    // Convertir a ArrayBuffer y envolver en File (UploadFile requiere un archivo con nombre)
    const pdfArrayBuffer = doc.output('arraybuffer');
    const safeName = `Recibo_${player.nombre.replace(/\s+/g, '_')}_${payment.mes}.pdf`;
    const pdfFile = new File([pdfArrayBuffer], safeName, { type: 'application/pdf' });
    
    // Subir el PDF
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
      file: pdfFile
    });
    
    const reciboUrl = uploadResponse.file_url;
    console.log('✅ [generatePaymentReceipt] PDF subido:', reciboUrl);
    
    // Actualizar el pago con la URL del recibo
    await base44.asServiceRole.entities.Payment.update(paymentId, {
      recibo_url: reciboUrl
    });
    console.log('✅ [generatePaymentReceipt] Pago actualizado con recibo_url');
    
    // Convertir el PDF a base64 para enviarlo como adjunto por email
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    // Enviar el recibo por email con PDF adjunto usando función personalizada
    const emailBody = `
      <h2>Recibo de Pago - CD Bustarviejo</h2>
      <p>Estimados padres/tutores,</p>
      <p>En el archivo adjunto encontrará el recibo correspondiente al pago de <strong>${player.nombre}</strong>.</p>
      <hr>
      <p><strong>Temporada:</strong> ${payment.temporada}</p>
      <p><strong>Mes:</strong> ${payment.mes}</p>
      <p><strong>Tipo de Pago:</strong> ${payment.tipo_pago}</p>
      <p><strong>Importe:</strong> ${payment.cantidad}€</p>
      <p><strong>Estado:</strong> ✅ Pagado</p>
      <hr>
      <p style="font-size: 14px; color: #16a34a; font-weight: bold;">📎 El recibo está adjunto a este correo en formato PDF</p>
      <br>
      <p style="font-size: 12px; color: #666;">Este es un correo automático del sistema de gestión de CD Bustarviejo</p>
      <p style="font-size: 12px; color: #666;">Email: cdbustarviejo@gmail.com</p>
    `;
    
    const emailWithAttachment = {
      subject: `Recibo de Pago - ${player.nombre} - ${payment.mes}`,
      html: emailBody,
      attachments: [{
        filename: `Recibo_${player.nombre.replace(/\s+/g, '_')}_${payment.mes}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        type: 'application/pdf'
      }]
    };
    
    // Enviar a padre principal
    if (player.email_padre) {
      try {
        console.log('📧 [generatePaymentReceipt] Enviando a padre:', player.email_padre);
        await base44.asServiceRole.functions.invoke('sendEmail', {
          ...emailWithAttachment,
          to: player.email_padre
        });
        console.log('✅ [generatePaymentReceipt] Email enviado a padre');
      } catch (emailError) {
        console.error('❌ [generatePaymentReceipt] Error email padre:', emailError);
      }
    }
    
    // Enviar a segundo tutor si existe
    if (player.email_tutor_2) {
      try {
        console.log('📧 [generatePaymentReceipt] Enviando a tutor 2:', player.email_tutor_2);
        await base44.asServiceRole.functions.invoke('sendEmail', {
          ...emailWithAttachment,
          to: player.email_tutor_2
        });
        console.log('✅ [generatePaymentReceipt] Email enviado a tutor 2');
      } catch (emailError) {
        console.error('❌ [generatePaymentReceipt] Error email tutor 2:', emailError);
      }
    }
    
    console.log('✅ [generatePaymentReceipt] PROCESO COMPLETO - Recibo generado y enviado');
    return Response.json({
      success: true,
      recibo_url: reciboUrl,
      message: 'Recibo generado y enviado por email correctamente'
    });
    
  } catch (error) {
    console.error('❌ [generatePaymentReceipt] ERROR:', error);
    return Response.json({ 
      error: error.message || 'Error generating receipt' 
    }, { status: 500 });
  }
});