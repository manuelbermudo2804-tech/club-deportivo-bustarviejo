import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== "admin") {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await req.json();
    
    if (!paymentId) {
      return Response.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Obtener el pago
    const payments = await base44.asServiceRole.entities.Payment.list();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Obtener el jugador
    const players = await base44.asServiceRole.entities.Player.list();
    const player = players.find(p => p.id === payment.jugador_id);
    
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    // Obtener la configuración de la temporada
    const configs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = configs.find(c => c.activa === true);

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
    
    // Convertir el PDF a blob
    const pdfBlob = doc.output('blob');
    
    // Subir el PDF a almacenamiento privado
    const formData = new FormData();
    formData.append('file', pdfBlob, `recibo_${payment.id}.pdf`);
    
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
      file: pdfBlob
    });
    
    const reciboUrl = uploadResponse.file_url;
    
    // Actualizar el pago con la URL del recibo
    await base44.asServiceRole.entities.Payment.update(paymentId, {
      recibo_url: reciboUrl
    });
    
    // Enviar el recibo por email a los padres
    const emailBody = `
      <h2>Recibo de Pago - CD Bustarviejo</h2>
      <p>Estimados padres/tutores,</p>
      <p>Adjunto encontrará el recibo correspondiente al pago de <strong>${player.nombre}</strong>.</p>
      <hr>
      <p><strong>Temporada:</strong> ${payment.temporada}</p>
      <p><strong>Mes:</strong> ${payment.mes}</p>
      <p><strong>Tipo de Pago:</strong> ${payment.tipo_pago}</p>
      <p><strong>Importe:</strong> ${payment.cantidad}€</p>
      <p><strong>Estado:</strong> ✅ Pagado</p>
      <hr>
      <p><a href="${reciboUrl}" target="_blank" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">📄 Descargar Recibo</a></p>
      <br>
      <p style="font-size: 12px; color: #666;">Este es un correo automático del sistema de gestión de CD Bustarviejo</p>
      <p style="font-size: 12px; color: #666;">Email: cdbustarviejo@gmail.com</p>
    `;
    
    // Enviar a padre principal
    if (player.email_padre) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: player.email_padre,
          subject: `Recibo de Pago - ${player.nombre} - ${payment.mes}`,
          body: emailBody
        });
        console.log('✅ Recibo enviado a padre:', player.email_padre);
      } catch (emailError) {
        console.error('Error enviando email a padre:', emailError);
      }
    }
    
    // Enviar a segundo tutor si existe
    if (player.email_tutor_2) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: player.email_tutor_2,
          subject: `Recibo de Pago - ${player.nombre} - ${payment.mes}`,
          body: emailBody
        });
        console.log('✅ Recibo enviado a tutor 2:', player.email_tutor_2);
      } catch (emailError) {
        console.error('Error enviando email a tutor 2:', emailError);
      }
    }
    
    return Response.json({
      success: true,
      recibo_url: reciboUrl,
      message: 'Recibo generado y enviado por email correctamente'
    });
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    return Response.json({ 
      error: error.message || 'Error generating receipt' 
    }, { status: 500 });
  }
});