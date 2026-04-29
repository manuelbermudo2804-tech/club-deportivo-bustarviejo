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

const numeroALetras = (num) => {
  const n = parseFloat(String(num).replace(",", "."));
  if (isNaN(n)) return "";
  const entero = Math.floor(n);
  const decimal = Math.round((n - entero) * 100);
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte"];
  const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
  const conv = (num) => {
    if (num === 0) return "cero";
    if (num === 100) return "cien";
    if (num <= 20) return unidades[num];
    if (num < 100) { const d = Math.floor(num/10), u = num%10; if (num<30) return "veinti"+unidades[u]; return decenas[d]+(u?" y "+unidades[u]:""); }
    if (num < 1000) { const c = Math.floor(num/100), r = num%100; return centenas[c]+(r?" "+conv(r):""); }
    if (num < 1000000) { const m = Math.floor(num/1000), r = num%1000; return (m===1?"mil":conv(m)+" mil")+(r?" "+conv(r):""); }
    return String(num);
  };
  let r = conv(entero) + " euros";
  if (decimal > 0) r += " con " + conv(decimal) + " céntimos";
  return r.charAt(0).toUpperCase() + r.slice(1);
};

export async function buildReciboPDF({ numero, fecha, recibiDe, cantidad, concepto, temporada, lugar, logoUrl, selloUrl, firmaUrl }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 20;

  // ===== MARCO DECORATIVO =====
  // Marco exterior fino
  doc.setDrawColor(251, 146, 60);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageW - 24, pageH - 24);

  // Marco interior grueso naranja
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(1.2);
  doc.rect(15, 15, pageW - 30, pageH - 30);

  // Esquinas decorativas
  doc.setDrawColor(194, 65, 12);
  doc.setLineWidth(1.5);
  const cornerSize = 8;
  // Top-left
  doc.line(15, 15 + cornerSize, 15, 15);
  doc.line(15, 15, 15 + cornerSize, 15);
  // Top-right
  doc.line(pageW - 15 - cornerSize, 15, pageW - 15, 15);
  doc.line(pageW - 15, 15, pageW - 15, 15 + cornerSize);
  // Bottom-left
  doc.line(15, pageH - 15 - cornerSize, 15, pageH - 15);
  doc.line(15, pageH - 15, 15 + cornerSize, pageH - 15);
  // Bottom-right
  doc.line(pageW - 15 - cornerSize, pageH - 15, pageW - 15, pageH - 15);
  doc.line(pageW - 15, pageH - 15 - cornerSize, pageW - 15, pageH - 15);

  // ===== MARCA DE AGUA (translúcida) =====
  const logoData = await loadImageAsDataUrl(logoUrl);
  if (logoData) {
    try {
      const gStateWatermark = new doc.GState({ opacity: 0.06 });
      doc.setGState(gStateWatermark);
      doc.addImage(logoData, "PNG", pageW / 2 - 50, pageH / 2 - 50, 100, 100, undefined, "FAST");
      // Restaurar opacidad normal para el resto del documento
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch (e) {
      console.warn("No se pudo aplicar opacidad a la marca de agua:", e);
    }
  }

  // ===== HEADER =====
  // Logo
  if (logoData) {
    try { doc.addImage(logoData, "JPEG", marginX + 5, 22, 22, 22); } catch { try { doc.addImage(logoData, "PNG", marginX + 5, 22, 22, 22); } catch {} }
  }

  // Nombre del club
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("CD BUSTARVIEJO", marginX + 32, 30);

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Club Deportivo · Bustarviejo · Madrid", marginX + 32, 36);

  // Caja del Nº recibo
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageW - marginX - 38, 22, 33, 22, 2, 2, "FD");

  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("RECIBO Nº", pageW - marginX - 21.5, 28, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(234, 88, 12);
  doc.text(String(numero || "—"), pageW - marginX - 21.5, 36, { align: "center" });

  // Fecha bajo el número
  let fechaFmt = "____ de __________ de ______";
  try { if (fecha) fechaFmt = format(parseISO(fecha), "d 'de' MMMM 'de' yyyy", { locale: es }); } catch {}
  doc.setFont("times", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(fechaFmt, pageW - marginX - 21.5, 41.5, { align: "center" });

  // ===== SEPARADOR ORNAMENTAL =====
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.6);
  doc.line(marginX, 55, pageW / 2 - 4, 55);
  doc.line(pageW / 2 + 4, 55, pageW - marginX, 55);
  // Punto central
  doc.setFillColor(234, 88, 12);
  doc.circle(pageW / 2, 55, 1.2, "F");

  // ===== TÍTULO =====
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(30, 41, 59);
  doc.text("R E C I B Í", pageW / 2, 75, { align: "center" });

  // Sub-línea bajo el título
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.8);
  doc.line(pageW / 2 - 12, 79, pageW / 2 + 12, 79);

  // ===== CUERPO =====
  let y = 100;

  const writeMiniLabel = (label, yPos) => {
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(label.toUpperCase(), marginX, yPos);
  };

  const writeDottedLine = (yPos, value, bold = false, sizeText = 13) => {
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(sizeText);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value || ""), marginX, yPos);
    // Línea de puntos
    doc.setLineDashPattern([0.5, 1], 0);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(marginX, yPos + 1.5, pageW - marginX, yPos + 1.5);
    doc.setLineDashPattern([], 0);
  };

  // Recibí de
  writeMiniLabel("Recibí de", y);
  y += 6;
  writeDottedLine(y, recibiDe || "________________________________", true, 13);
  y += 12;

  // Cantidad — caja destacada
  writeMiniLabel("La cantidad de", y);
  y += 7;
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(194, 65, 12);
  const cantidadTxt = cantidad ? `${cantidad} €` : "________ €";
  doc.text(cantidadTxt, marginX, y);
  y += 2;
  doc.setLineDashPattern([0.5, 1], 0);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  if (cantidad) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${numeroALetras(cantidad)})`, marginX, y);
    y += 10;
  } else {
    y += 5;
  }

  // En concepto de
  writeMiniLabel("En concepto de", y);
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const conceptoCompleto = (concepto || "________________________") + (temporada ? `  ·  Temporada ${temporada}` : "");
  const conceptoLines = doc.splitTextToSize(conceptoCompleto, pageW - marginX * 2);
  doc.text(conceptoLines, marginX, y);
  y += conceptoLines.length * 6 + 1;
  doc.setLineDashPattern([0.5, 1], 0);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  doc.setLineDashPattern([], 0);

  // ===== LUGAR Y FECHA =====
  y += 25;
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text("En ", marginX, y);
  doc.setFont("times", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(lugar || "________", marginX + 8, y);
  doc.setFont("times", "italic");
  doc.setTextColor(71, 85, 105);
  const lugarW = doc.getTextWidth(lugar || "________");
  doc.text(", a ", marginX + 8 + lugarW, y);
  doc.setFont("times", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(fechaFmt + ".", marginX + 8 + lugarW + 6, y);

  // ===== FIRMA Y SELLO =====
  y += 35;

  // Firma escaneada (encima de la línea)
  if (firmaUrl) {
    const firmaData = await loadImageAsDataUrl(firmaUrl);
    if (firmaData) {
      try {
        doc.addImage(firmaData, "PNG", marginX + 12, y - 22, 55, 22);
      } catch {
        try { doc.addImage(firmaData, "JPEG", marginX + 12, y - 22, 55, 22); } catch {}
      }
    }
  }

  // Línea de firma
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, marginX + 80, y);

  // Etiqueta del cargo
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(194, 65, 12);
  doc.text("EL PRESIDENTE", marginX + 40, y + 4.5, { align: "center" });

  // Nombre
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Manuel Bermudo Santacruz", marginX + 40, y + 10, { align: "center" });

  // DNI
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DNI: 51404895X", marginX + 40, y + 15, { align: "center" });

  // Sello
  if (selloUrl) {
    const selloData = await loadImageAsDataUrl(selloUrl);
    if (selloData) {
      try {
        doc.addImage(selloData, "PNG", pageW - marginX - 50, y - 30, 48, 48);
      } catch {
        try { doc.addImage(selloData, "JPEG", pageW - marginX - 50, y - 30, 48, 48); } catch {}
      }
    }
  }

  // ===== PIE DE PÁGINA =====
  doc.setFont("times", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("CD Bustarviejo · cdbustarviejo@gmail.com · Bustarviejo, Madrid", pageW / 2, pageH - 22, { align: "center" });

  const filename = `Recibo_${numero || "sin-numero"}_${recibiDe ? recibiDe.replace(/\s+/g, "_").slice(0, 20) : ""}.pdf`;
  const blob = doc.output("blob");
  return { doc, blob, filename };
}

export async function generateReciboPDF(params) {
  const { doc, filename } = await buildReciboPDF(params);
  doc.save(filename);
  return filename;
}

export async function generateReciboBlob(params) {
  const { blob, filename } = await buildReciboPDF(params);
  return { blob, filename };
}