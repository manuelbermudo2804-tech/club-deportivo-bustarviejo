import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

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

    // Generar el PDF del recibo
    const doc = new jsPDF();
    
    // Header con logo y título
    doc.setFontSize(20);
    doc.setTextColor(234, 88, 12); // Orange
    doc.text('CD BUSTARVIEJO', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('RECIBO DE PAGO', 105, 30, { align: 'center' });
    
    // Línea separadora
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Información del recibo
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    const startY = 45;
    let currentY = startY;
    
    // Número de recibo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Nº Recibo: ${payment.id.substring(0, 8).toUpperCase()}`, 20, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${new Date(payment.fecha_pago || payment.created_date).toLocaleDateString('es-ES')}`, 20, currentY);
    currentY += 15;
    
    // Datos del jugador
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('DATOS DEL JUGADOR', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${player.nombre}`, 25, currentY);
    currentY += 6;
    doc.text(`Categoría: ${player.deporte || 'No especificado'}`, 25, currentY);
    currentY += 15;
    
    // Datos del pago
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('CONCEPTO DEL PAGO', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Temporada: ${payment.temporada}`, 25, currentY);
    currentY += 6;
    doc.text(`Tipo de Pago: ${payment.tipo_pago}`, 25, currentY);
    currentY += 6;
    doc.text(`Mes: ${payment.mes}`, 25, currentY);
    currentY += 6;
    doc.text(`Método de Pago: ${payment.metodo_pago}`, 25, currentY);
    currentY += 15;
    
    // Importe - destacado
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(20, currentY - 5, 170, 15, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`IMPORTE TOTAL: ${payment.cantidad.toFixed(2)}€`, 105, currentY + 5, { align: 'center' });
    currentY += 20;
    
    // Información adicional
    if (payment.notas) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Notas:', 20, currentY);
      currentY += 6;
      doc.setTextColor(60, 60, 60);
      
      // Split text si es muy largo
      const notasLines = doc.splitTextToSize(payment.notas, 170);
      doc.text(notasLines, 25, currentY);
      currentY += (notasLines.length * 6) + 10;
    }
    
    // Pie de página
    currentY = 270;
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.3);
    doc.line(20, currentY, 190, currentY);
    currentY += 5;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('CD BUSTARVIEJO - Club Deportivo Bustarviejo', 105, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Email: cdbustarviejo@gmail.com', 105, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Este recibo ha sido generado automáticamente', 105, currentY, { align: 'center' });
    
    console.log('📝 [generatePaymentReceipt] PDF generado, subiendo a almacenamiento...');
    
    // Convertir a ArrayBuffer para upload
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    
    // Subir el PDF
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
      file: pdfBlob
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