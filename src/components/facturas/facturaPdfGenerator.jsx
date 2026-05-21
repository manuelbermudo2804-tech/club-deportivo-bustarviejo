import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Convierte una URL de imagen en dataURL para jsPDF (evita CORS)
const loadImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("No se pudo cargar imagen:", url, e);
    return null;
  }
};

const fmtMoney = (n) => {
  const num = parseFloat(String(n).replace(",", ".")) || 0;
  return num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

const calcTotals = (lineas, ivaPct) => {
  const base = (lineas || []).reduce((acc, l) => {
    const cant = parseFloat(String(l.cantidad || 1).replace(",", ".")) || 0;
    const precio = parseFloat(String(l.precio || 0).replace(",", ".")) || 0;
    return acc + cant * precio;
  }, 0);
  const iva = (parseFloat(String(ivaPct || 0).replace(",", ".")) || 0);
  const ivaImporte = base * (iva / 100);
  const total = base + ivaImporte;
  return { base, ivaImporte, total, ivaPct: iva };
};

export async function buildFacturaPDF({
  numero,
  fecha,
  fechaVencimiento,
  // Emisor
  emisorNombre,
  emisorCif,
  emisorDireccion,
  emisorCp,
  emisorEmail,
  emisorTelefono,
  // Cliente
  clienteNombre,
  clienteCif,
  clienteDireccion,
  clienteCp,
  clienteEmail,
  // Líneas + impuestos
  lineas,
  ivaPct,
  // Pago
  formaPago,
  iban,
  observaciones,
  // Branding
  logoUrl,
  selloUrl,
  firmaUrl,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;

  // Cargar imágenes
  const logoData = await loadImageAsDataUrl(logoUrl);
  const selloData = await loadImageAsDataUrl(selloUrl);
  const firmaData = await loadImageAsDataUrl(firmaUrl);

  // ===== MARCA DE AGUA =====
  if (logoData) {
    try {
      const gs = new doc.GState({ opacity: 0.05 });
      doc.setGState(gs);
      doc.addImage(logoData, "PNG", pageW / 2 - 55, pageH / 2 - 55, 110, 110, undefined, "FAST");
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch (e) {
      console.warn("Marca de agua no aplicada:", e);
    }
  }

  // ===== BANDA SUPERIOR =====
  doc.setFillColor(234, 88, 12); // naranja
  doc.rect(0, 0, pageW, 6, "F");

  // ===== HEADER: LOGO + NOMBRE + Nº FACTURA =====
  if (logoData) {
    try { doc.addImage(logoData, "JPEG", marginX, 14, 22, 22); }
    catch { try { doc.addImage(logoData, "PNG", marginX, 14, 22, 22); } catch {} }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(emisorNombre || "CD BUSTARVIEJO", marginX + 27, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  let lineY = 27;
  if (emisorCif) { doc.text(`CIF: ${emisorCif}`, marginX + 27, lineY); lineY += 3.8; }
  if (emisorDireccion) { doc.text(emisorDireccion, marginX + 27, lineY); lineY += 3.8; }
  if (emisorCp) { doc.text(emisorCp, marginX + 27, lineY); lineY += 3.8; }
  const contactLine = [emisorEmail, emisorTelefono].filter(Boolean).join("  ·  ");
  if (contactLine) { doc.text(contactLine, marginX + 27, lineY); lineY += 3.8; }

  // Caja Nº factura (derecha)
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageW - marginX - 60, 14, 60, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("FACTURA", pageW - marginX - 30, 21, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Nº", pageW - marginX - 56, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(234, 88, 12);
  doc.text(String(numero || "—"), pageW - marginX - 50, 27.5);

  // Fecha
  let fechaFmt = "";
  try { if (fecha) fechaFmt = format(parseISO(fecha), "dd/MM/yyyy", { locale: es }); } catch {}
  let fechaVencFmt = "";
  try { if (fechaVencimiento) fechaVencFmt = format(parseISO(fechaVencimiento), "dd/MM/yyyy", { locale: es }); } catch {}

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Fecha:", pageW - marginX - 56, 33);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(fechaFmt || "—", pageW - marginX - 44, 33);

  if (fechaVencFmt) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Vto.:", pageW - marginX - 56, 37);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(fechaVencFmt, pageW - marginX - 44, 37);
  }

  // ===== DATOS CLIENTE =====
  const clientBoxY = 52;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, clientBoxY, pageW - marginX * 2, 28, 2, 2, "FD");

  // Cinta lateral naranja
  doc.setFillColor(234, 88, 12);
  doc.rect(marginX, clientBoxY, 1.5, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(234, 88, 12);
  doc.text("FACTURAR A", marginX + 5, clientBoxY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(clienteNombre || "—", marginX + 5, clientBoxY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let cY = clientBoxY + 17;
  if (clienteCif) { doc.text(`CIF/NIF: ${clienteCif}`, marginX + 5, cY); cY += 4; }
  if (clienteDireccion) { doc.text(clienteDireccion, marginX + 5, cY); cY += 4; }
  if (clienteCp) { doc.text(clienteCp, marginX + 5, cY); cY += 4; }
  if (clienteEmail) { doc.text(clienteEmail, marginX + 5, cY); }

  // ===== TABLA DE CONCEPTOS =====
  const tableY = clientBoxY + 36;

  // Header tabla
  doc.setFillColor(30, 41, 59);
  doc.rect(marginX, tableY, pageW - marginX * 2, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const colDescX = marginX + 3;
  const colCantX = pageW - marginX - 60;
  const colPrecioX = pageW - marginX - 38;
  const colTotalX = pageW - marginX - 3;

  doc.text("CONCEPTO", colDescX, tableY + 5.3);
  doc.text("CANT.", colCantX, tableY + 5.3, { align: "right" });
  doc.text("PRECIO", colPrecioX, tableY + 5.3, { align: "right" });
  doc.text("TOTAL", colTotalX, tableY + 5.3, { align: "right" });

  // Filas
  let rowY = tableY + 8;
  const items = (lineas && lineas.length > 0) ? lineas : [{ descripcion: "", cantidad: 1, precio: 0 }];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  items.forEach((linea, idx) => {
    const cant = parseFloat(String(linea.cantidad || 1).replace(",", ".")) || 0;
    const precio = parseFloat(String(linea.precio || 0).replace(",", ".")) || 0;
    const total = cant * precio;

    // Alterar color filas
    if (idx % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX, rowY, pageW - marginX * 2, 9, "F");
    }

    // Descripción (con wrap)
    const descLines = doc.splitTextToSize(linea.descripcion || "—", colCantX - colDescX - 5);
    const rowHeight = Math.max(9, descLines.length * 4.5 + 3);

    if (idx % 2 === 1) {
      // Repintar fila con altura real si hay wrap
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX, rowY, pageW - marginX * 2, rowHeight, "F");
    }

    doc.setTextColor(30, 41, 59);
    doc.text(descLines, colDescX, rowY + 5.5);
    doc.text(String(cant), colCantX, rowY + 5.5, { align: "right" });
    doc.text(fmtMoney(precio), colPrecioX, rowY + 5.5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(fmtMoney(total), colTotalX, rowY + 5.5, { align: "right" });
    doc.setFont("helvetica", "normal");

    rowY += rowHeight;
  });

  // Línea cierre tabla
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, rowY, pageW - marginX, rowY);

  // ===== TOTALES =====
  const totals = calcTotals(items, ivaPct);
  let totY = rowY + 6;
  const totBoxX = pageW - marginX - 75;
  const totBoxW = 75;

  // Base imponible
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Base imponible", totBoxX + 3, totY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(fmtMoney(totals.base), totBoxX + totBoxW - 3, totY, { align: "right" });
  totY += 5.5;

  // IVA
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`IVA (${totals.ivaPct}%)`, totBoxX + 3, totY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(fmtMoney(totals.ivaImporte), totBoxX + totBoxW - 3, totY, { align: "right" });
  totY += 4;

  // Separador
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(totBoxX + 3, totY, totBoxX + totBoxW - 3, totY);
  totY += 5;

  // TOTAL (caja destacada)
  doc.setFillColor(234, 88, 12);
  doc.roundedRect(totBoxX, totY - 4, totBoxW, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", totBoxX + 3, totY + 2.5);
  doc.setFontSize(13);
  doc.text(fmtMoney(totals.total), totBoxX + totBoxW - 3, totY + 3, { align: "right" });
  totY += 14;

  // ===== FORMA DE PAGO + OBSERVACIONES =====
  let payY = totY + 6;

  if (formaPago || iban) {
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, payY, 100, 18, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text("FORMA DE PAGO", marginX + 3, payY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    if (formaPago) doc.text(formaPago, marginX + 3, payY + 10);
    if (iban) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`IBAN: ${iban}`, marginX + 3, payY + 15);
    }
  }

  if (observaciones) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("OBSERVACIONES", marginX, payY + 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(observaciones, pageW - marginX * 2);
    doc.text(obsLines, marginX, payY + 30);
  }

  // ===== FIRMA Y SELLO =====
  const firmaY = pageH - 55;

  // Firma escaneada
  if (firmaData) {
    try { doc.addImage(firmaData, "PNG", pageW - marginX - 72, firmaY - 20, 50, 20); }
    catch { try { doc.addImage(firmaData, "JPEG", pageW - marginX - 72, firmaY - 20, 50, 20); } catch {} }
  }

  // Línea firma
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(pageW - marginX - 80, firmaY, pageW - marginX - 15, firmaY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(234, 88, 12);
  doc.text("EL PRESIDENTE", pageW - marginX - 47.5, firmaY + 4, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Manuel Bermudo Santacruz", pageW - marginX - 47.5, firmaY + 9, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DNI: 51404895X", pageW - marginX - 47.5, firmaY + 13, { align: "center" });

  // Sello (a la izquierda del bloque de firma)
  if (selloData) {
    try { doc.addImage(selloData, "PNG", marginX + 5, firmaY - 28, 42, 42); }
    catch { try { doc.addImage(selloData, "JPEG", marginX + 5, firmaY - 28, 42, 42); } catch {} }
  }

  // ===== PIE DE PÁGINA =====
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, pageH - 18, pageW - marginX, pageH - 18);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const footerLine = `${emisorNombre || "CD Bustarviejo"} · ${emisorCif ? "CIF " + emisorCif + " · " : ""}${emisorEmail || "info@cdbustarviejo.com"}`;
  doc.text(footerLine, pageW / 2, pageH - 13, { align: "center" });
  doc.text("Documento generado electrónicamente · Válido sin firma manuscrita acompañado del sello del club", pageW / 2, pageH - 9, { align: "center" });

  // Banda inferior
  doc.setFillColor(234, 88, 12);
  doc.rect(0, pageH - 4, pageW, 4, "F");

  const filename = `Factura_${numero || "sin-numero"}_${clienteNombre ? clienteNombre.replace(/\s+/g, "_").slice(0, 20) : ""}.pdf`;
  const blob = doc.output("blob");
  return { doc, blob, filename };
}

export async function generateFacturaPDF(params) {
  const { doc, filename } = await buildFacturaPDF(params);
  doc.save(filename);
  return filename;
}

export async function generateFacturaBlob(params) {
  const { blob, filename } = await buildFacturaPDF(params);
  return { blob, filename };
}

export { calcTotals, fmtMoney };