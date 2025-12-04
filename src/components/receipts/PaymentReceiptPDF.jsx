import { jsPDF } from "jspdf";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

/**
 * Genera un número de recibo único basado en el ID del pago y la fecha
 */
export const generateReceiptNumber = (paymentId, date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = paymentId?.slice(-6).toUpperCase() || Math.random().toString(36).slice(-6).toUpperCase();
  return `REC-${year}${month}-${shortId}`;
};

/**
 * Genera un PDF de recibo de pago
 * @param {Object} data - Datos del recibo
 * @param {string} data.tipo - "jugador" | "socio"
 * @param {string} data.nombre - Nombre del pagador
 * @param {string} data.dni - DNI del pagador
 * @param {string} data.concepto - Concepto del pago
 * @param {number} data.importe - Importe en euros
 * @param {string} data.temporada - Temporada
 * @param {string} data.fechaPago - Fecha del pago
 * @param {string} data.metodoPago - Método de pago
 * @param {string} data.numeroRecibo - Número de recibo
 * @param {string} [data.jugadorNombre] - Nombre del jugador (si es pago de jugador)
 * @param {string} [data.categoria] - Categoría del jugador
 * @param {string} [data.mes] - Mes del pago (Junio, Septiembre, Diciembre)
 * @returns {jsPDF} - Documento PDF
 */
export const generatePaymentReceiptPDF = (data) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colores del club
  const orange = [249, 115, 22];
  const green = [34, 197, 94];
  const darkGray = [30, 41, 59];
  const lightGray = [241, 245, 249];

  // Header con gradiente simulado
  doc.setFillColor(...orange);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setFillColor(...green);
  doc.rect(0, 42, pageWidth, 3, 'F');

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("CD BUSTARVIEJO", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("RECIBO DE PAGO", pageWidth / 2, 32, { align: "center" });

  // Número de recibo y fecha
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Nº Recibo: ${data.numeroRecibo}`, 15, 55);
  doc.text(`Fecha: ${new Date(data.fechaPago).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 15, 55, { align: "right" });

  // Línea separadora
  doc.setDrawColor(...orange);
  doc.setLineWidth(0.5);
  doc.line(15, 60, pageWidth - 15, 60);

  // Sección: Datos del pagador
  let yPos = 72;
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setTextColor(...orange);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PAGADOR", 20, yPos + 3);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  yPos += 12;
  doc.text(`Nombre: ${data.nombre}`, 20, yPos);
  yPos += 7;
  doc.text(`DNI: ${data.dni || 'No especificado'}`, 20, yPos);
  yPos += 7;
  doc.text(`Temporada: ${data.temporada}`, 20, yPos);

  // Sección: Concepto del pago
  yPos += 20;
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, data.tipo === "jugador" ? 42 : 28, 3, 3, 'F');
  
  doc.setTextColor(...green);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CONCEPTO DEL PAGO", 20, yPos + 3);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  yPos += 12;
  
  if (data.tipo === "jugador") {
    doc.text(`Jugador: ${data.jugadorNombre}`, 20, yPos);
    yPos += 7;
    doc.text(`Categoría: ${data.categoria || 'No especificada'}`, 20, yPos);
    yPos += 7;
    doc.text(`Periodo: ${data.mes} ${data.temporada}`, 20, yPos);
    yPos += 7;
    doc.text(`Concepto: Cuota de inscripción deportiva`, 20, yPos);
  } else {
    doc.text(`Concepto: ${data.concepto || 'Cuota de Socio'}`, 20, yPos);
    yPos += 7;
    doc.text(`Tipo: ${data.tipoInscripcion || 'Membresía anual'}`, 20, yPos);
  }

  // Sección: Importe (destacado)
  yPos += 25;
  doc.setFillColor(...green);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 30, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTE TOTAL", 20, yPos + 5);
  
  doc.setFontSize(24);
  doc.text(`${data.importe.toFixed(2)} €`, pageWidth - 20, yPos + 8, { align: "right" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Método de pago: ${data.metodoPago || 'Transferencia bancaria'}`, 20, yPos + 18);
  doc.text("PAGADO ✓", pageWidth - 20, yPos + 18, { align: "right" });

  // Información del club
  yPos += 45;
  doc.setTextColor(...darkGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLUB", 20, yPos + 3);
  
  doc.setFont("helvetica", "normal");
  yPos += 10;
  doc.text("Club Deportivo Bustarviejo", 20, yPos);
  yPos += 5;
  doc.text("CIF: G-XXXXXXXX", 20, yPos);
  yPos += 5;
  doc.text("Email: cdbustarviejo@gmail.com", 20, yPos);
  yPos += 5;
  doc.text("Bustarviejo, Madrid", 20, yPos);

  // Pie de página
  const footerY = doc.internal.pageSize.getHeight() - 25;
  
  doc.setDrawColor(...orange);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text("Este recibo es un documento válido como justificante de pago.", pageWidth / 2, footerY, { align: "center" });
  doc.text("CD Bustarviejo - Formando deportistas desde 1970", pageWidth / 2, footerY + 5, { align: "center" });
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, footerY + 10, { align: "center" });

  return doc;
};

/**
 * Genera y envía el recibo por email
 * @param {Object} data - Datos del recibo
 * @param {string} email - Email del destinatario
 * @param {Object} base44 - Instancia del SDK
 */
export const sendPaymentReceipt = async (data, email, base44) => {
  try {
    // Generar el PDF
    const doc = generatePaymentReceiptPDF(data);
    
    // Convertir a blob y subir
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `recibo_${data.numeroRecibo}.pdf`, { type: 'application/pdf' });
    
    // Subir el archivo
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    
    // Preparar el email
    const tipoTexto = data.tipo === "jugador" 
      ? `cuota de ${data.mes} de ${data.jugadorNombre}` 
      : "cuota de socio";
    
    const emailBody = `
Estimado/a ${data.nombre},

Confirmamos que hemos recibido correctamente el pago de la ${tipoTexto}.

📋 DETALLES DEL PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nº Recibo: ${data.numeroRecibo}
Concepto: ${data.tipo === "jugador" ? `Cuota ${data.mes} - ${data.jugadorNombre}` : 'Cuota de Socio'}
Importe: ${data.importe.toFixed(2)} €
Temporada: ${data.temporada}
Fecha: ${new Date(data.fechaPago).toLocaleDateString('es-ES')}
Método: ${data.metodoPago || 'Transferencia'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📎 Adjunto encontrarás el recibo oficial en formato PDF.

¡Gracias por tu apoyo al CD Bustarviejo!

Atentamente,
CD Bustarviejo
cdbustarviejo@gmail.com
    `;

    // Enviar email con enlace al PDF
    await base44.integrations.Core.SendEmail({
      from_name: "CD Bustarviejo",
      to: email,
      subject: `✅ Recibo de Pago - ${data.numeroRecibo} - CD Bustarviejo`,
      body: emailBody + `\n\n📄 Descarga tu recibo: ${file_url}`
    });

    console.log('✅ [PaymentReceipt] Recibo enviado correctamente a:', email);
    return { success: true, receiptUrl: file_url };
  } catch (error) {
    console.error('❌ [PaymentReceipt] Error enviando recibo:', error);
    throw error;
  }
};

/**
 * Genera datos de recibo para pago de jugador
 */
export const createPlayerPaymentReceiptData = (payment, player, seasonConfig) => {
  return {
    tipo: "jugador",
    nombre: player?.email_padre ? `Tutor de ${player.nombre}` : payment.jugador_nombre,
    dni: player?.dni_tutor_legal || player?.dni_jugador || '',
    concepto: `Cuota ${payment.mes} - ${payment.jugador_nombre}`,
    importe: payment.cantidad,
    temporada: payment.temporada,
    fechaPago: payment.fecha_pago || new Date().toISOString(),
    metodoPago: payment.metodo_pago || 'Transferencia',
    numeroRecibo: generateReceiptNumber(payment.id),
    jugadorNombre: payment.jugador_nombre,
    categoria: player?.deporte || '',
    mes: payment.mes
  };
};

/**
 * Genera datos de recibo para cuota de socio
 */
export const createMemberPaymentReceiptData = (member, seasonConfig) => {
  return {
    tipo: "socio",
    nombre: member.nombre_completo,
    dni: member.dni || '',
    concepto: 'Cuota de Socio',
    importe: member.cuota_socio || 25,
    temporada: member.temporada || seasonConfig?.temporada,
    fechaPago: member.fecha_pago || new Date().toISOString(),
    metodoPago: member.metodo_pago || 'Transferencia',
    numeroRecibo: generateReceiptNumber(member.id),
    tipoInscripcion: member.tipo_inscripcion
  };
};

export default generatePaymentReceiptPDF;