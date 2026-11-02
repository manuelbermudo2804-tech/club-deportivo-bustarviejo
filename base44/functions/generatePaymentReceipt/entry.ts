import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

// Generador deliberadamente simple: no depende de imágenes remotas ni de correo.
Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Método no permitido' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const paymentId = body?.paymentId;
    if (!paymentId || typeof paymentId !== 'string') {
      return Response.json({ error: 'Falta el identificador del pago.' }, { status: 400 });
    }

    console.log('[receipt-v2] inicio', paymentId);
    const payment = await base44.asServiceRole.entities.Payment.get(paymentId);
    if (!payment) return Response.json({ error: 'No se encuentra el pago.' }, { status: 404 });

    // Si ya existe un recibo adjunto o generado, reutilizarlo.
    if (payment.recibo_url && /^https?:\/\//i.test(payment.recibo_url)) {
      return Response.json({ success: true, recibo_url: payment.recibo_url, reused: true });
    }

    const player = await base44.asServiceRole.entities.Player.get(payment.jugador_id);
    if (!player) return Response.json({ error: 'No se encuentra el jugador asociado al pago.' }, { status: 404 });

    // Referencia determinista: no necesita consultas de recuento ni genera carreras.
    const numero = payment.numero_recibo || `CB-${String(payment.id).slice(-8).toUpperCase()}`;
    const fechaOrigen = payment.fecha_pago || payment.updated_date || payment.created_date || new Date().toISOString();
    const fecha = new Date(fechaOrigen);
    const fechaTexto = Number.isNaN(fecha.getTime()) ? 'Fecha no disponible' : fecha.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
    const cantidad = Number(payment.cantidad || 0);
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      return Response.json({ error: 'El importe del pago no es válido.' }, { status: 422 });
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(1);
    doc.roundedRect(12, 12, 186, 273, 3, 3);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CD BUSTARVIEJO', 105,  thirty(), { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Club Deportivo · Bustarviejo · Madrid', 105,  forty(), { align: 'center' });
    doc.setDrawColor(234, 88, 12);
    doc.line(30, 48, 180, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.text('RECIBO DE PAGO', 105, 65, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const lines = [
      ['N.º de recibo', numero],
      ['Fecha de pago', fechaTexto],
      ['Recibido de', player.nombre_tutor_legal || player.nombre || payment.jugador_nombre || 'No indicado'],
      ['Jugador/a', player.nombre || payment.jugador_nombre || 'No indicado'],
      ['Concepto', `Cuota ${payment.mes || 'no especificada'} · Temporada ${payment.temporada || 'no especificada'}`],
      ['Método de pago', payment.metodo_pago || payment.tipo_pago || 'No especificado'],
    ];
    let y = 90;
    for (const [label, value] of lines) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 28, y);
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(String(value), 112);
      doc.text(wrapped, 72, y);
      y += Math.max(12, wrapped.length * 6 + 3);
    }
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(234, 88, 12);
    doc.roundedRect(28, y + 4, 154, 25, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(194, 65, 12);
    doc.text(`IMPORTE: ${cantidad.toFixed(2)} €`, 105, y + 20, { align: 'center' });
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Documento generado por el sistema de gestión del CD Bustarviejo.', 105, 270, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    const safePlayer = String(player.nombre || 'Jugador').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
    const safeMonth = String(payment.mes || 'Pago').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 30);
    const pdfFile = new File([pdfBytes], `Recibo_${safePlayer}_${safeMonth}.pdf`, { type: 'application/pdf' });

    console.log('[receipt-v2] pdf listo; subiendo', paymentId);
    const upload = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    const url = upload?.file_url || upload?.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      console.error('[receipt-v2] respuesta de almacenamiento sin URL válida', JSON.stringify(upload || {}));
      throw new Error('El almacenamiento no devolvió una URL válida para el PDF.');
    }

    // Guardar URL y número en un único update; el pago no cambia de estado.
    await base44.asServiceRole.entities.Payment.update(paymentId, {
      recibo_url: url,
      numero_recibo: numero
    });

    console.log('[receipt-v2] éxito', paymentId, Date.now() - startedAt, 'ms');
    return Response.json({ success: true, recibo_url: url, numero_recibo: numero });
  } catch (error) {
    console.error('[receipt-v2] error', error?.stack || error);
    return Response.json({
      success: false,
      error: error?.message || 'No se pudo generar el recibo.'
    }, { status: 500 });
  }
});

function thirty() { return 30; }
function forty() { return 38; }
