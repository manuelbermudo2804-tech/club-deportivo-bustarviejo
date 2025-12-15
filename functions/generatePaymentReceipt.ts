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
    
    // Convertir el PDF a base64 para enviarlo como adjunto
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    // También subir a almacenamiento para guardar la URL
    const pdfBlob = doc.output('blob');
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
      file: pdfBlob
    });
    
    const reciboUrl = uploadResponse.file_url;
    
    // Actualizar el pago con la URL del recibo
    await base44.asServiceRole.entities.Payment.update(paymentId, {
      recibo_url: reciboUrl
    });
    
    // Generar email HTML embebido con el recibo en base64
    const emailBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f1f5f9;">
<table cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:26px;">CD BUSTARVIEJO</h1>
<p style="color:#fed7aa;margin:5px 0 0 0;font-size:14px;">Recibo de Pago</p>
</td>
</tr>
<tr>
<td style="padding:30px;">
<h2 style="color:#1e293b;margin:0 0 15px 0;">✅ Pago Confirmado</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Estimados padres/tutores,
</p>
<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Su pago correspondiente a <strong>${player.nombre}</strong> ha sido registrado correctamente.
</p>
<table width="100%" style="margin:20px 0;background-color:#f8fafc;border-radius:8px;overflow:hidden;">
<tr><td style="padding:15px;">
<p style="margin:5px 0;color:#334155;"><strong>Temporada:</strong> ${payment.temporada}</p>
<p style="margin:5px 0;color:#334155;"><strong>Mes:</strong> ${payment.mes}</p>
<p style="margin:5px 0;color:#334155;"><strong>Tipo de Pago:</strong> ${payment.tipo_pago}</p>
<p style="margin:5px 0;color:#334155;"><strong>Método:</strong> ${payment.metodo_pago}</p>
<p style="margin:10px 0 5px 0;color:#16a34a;font-size:18px;font-weight:bold;">💶 Importe: ${payment.cantidad.toFixed(2)}€</p>
</td></tr>
</table>
<table width="100%" style="margin:20px 0;background-color:#dcfce7;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;">
<tr><td style="padding:15px;">
<p style="margin:0;color:#166534;font-size:14px;font-weight:bold;">📎 Recibo Adjunto</p>
<p style="margin:5px 0 0 0;color:#166534;font-size:13px;">El recibo en PDF está adjunto a este email. Puede descargarlo y guardarlo para sus registros.</p>
</td></tr>
</table>
<p style="color:#94a3b8;font-size:12px;text-align:center;margin:20px 0 0 0;">Este es un correo automático del sistema de gestión de CD Bustarviejo</p>
</td>
</tr>
<tr>
<td bgcolor="#1e293b" style="padding:20px;text-align:center;">
<p style="color:#64748b;font-size:12px;margin:0;">cdbustarviejo@gmail.com</p>
</td>
</tr>
</table>
</body>
</html>`;
    
    // Construir el objeto del email con el PDF como data URI embebido
    const emailData = {
      from_name: "CD Bustarviejo",
      subject: `✅ Recibo de Pago - ${player.nombre} - ${payment.mes}`,
      body: emailBody,
      // Intentar enviar como adjunto usando data URI
      attachment_data_uri: `data:application/pdf;base64,${pdfBase64}`,
      attachment_filename: `Recibo_${player.nombre.replace(/\s+/g, '_')}_${payment.mes}.pdf`
    };
    
    // Enviar a padre principal
    if (player.email_padre) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: player.email_padre,
          from_name: emailData.from_name,
          subject: emailData.subject,
          body: emailData.body
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
          to: player.email_tutor_2,
          from_name: emailData.from_name,
          subject: emailData.subject,
          body: emailData.body
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