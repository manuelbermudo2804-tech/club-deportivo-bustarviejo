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
  const marginX = 20;

  // Header: logo
  const logoData = await loadImageAsDataUrl(logoUrl);
  if (logoData) {
    try { doc.addImage(logoData, "JPEG", marginX, 15, 25, 25); } catch { try { doc.addImage(logoData, "PNG", marginX, 15, 25, 25); } catch {} }
  }

  // Nombre del club
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("CD BUSTARVIEJO", marginX + 30, 25);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Club Deportivo — Bustarviejo, Madrid", marginX + 30, 32);

  // Nº recibo
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("RECIBO Nº", pageW - marginX, 20, { align: "right" });
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(234, 88, 12);
  doc.text(String(numero || "—"), pageW - marginX, 30, { align: "right" });

  // Línea naranja
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.8);
  doc.line(marginX, 45, pageW - marginX, 45);

  // Título
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(30, 41, 59);
  doc.text("RECIBÍ", pageW / 2, 70, { align: "center" });

  // Cuerpo
  let y = 90;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);

  const writeField = (label, value, yPos, bold = false) => {
    doc.setFont("times", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, marginX, yPos);
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setTextColor(15, 23, 42);
    const labelWidth = doc.getTextWidth(label + " ");
    doc.text(String(value || "________________________"), marginX + labelWidth, yPos);
  };

  writeField("Recibí de", recibiDe, y, true);
  y += 12;

  writeField("la cantidad de", cantidad ? `${cantidad} €` : "________ €", y, true);
  y += 7;
  if (cantidad) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${numeroALetras(cantidad)})`, marginX, y);
    y += 10;
  } else {
    y += 5;
  }

  doc.setFontSize(12);
  doc.setFont("times", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("en concepto de", marginX, y);
  y += 7;
  doc.setFont("times", "bold");
  doc.setTextColor(15, 23, 42);
  const conceptoCompleto = (concepto || "________________________") + (temporada ? ` — Temporada ${temporada}` : "") + ".";
  const conceptoLines = doc.splitTextToSize(conceptoCompleto, pageW - marginX * 2);
  doc.text(conceptoLines, marginX, y);
  y += conceptoLines.length * 7 + 20;

  // Lugar y fecha
  let fechaFmt = "____ de __________ de ______";
  try { if (fecha) fechaFmt = format(parseISO(fecha), "d 'de' MMMM 'de' yyyy", { locale: es }); } catch {}
  doc.setFont("times", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(`En ${lugar || "________"}, a ${fechaFmt}.`, marginX, y);

  // Firma y sello
  y += 40;

  // Firma (encima de la línea)
  if (firmaUrl) {
    const firmaData = await loadImageAsDataUrl(firmaUrl);
    if (firmaData) {
      try {
        doc.addImage(firmaData, "PNG", marginX + 10, y - 18, 50, 18);
      } catch {
        try { doc.addImage(firmaData, "JPEG", marginX + 10, y - 18, 50, 18); } catch {}
      }
    }
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, marginX + 70, y);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Firma y sello del club", marginX + 35, y + 5, { align: "center" });

  // Sello
  if (selloUrl) {
    const selloData = await loadImageAsDataUrl(selloUrl);
    if (selloData) {
      try {
        doc.addImage(selloData, "PNG", pageW - marginX - 50, y - 25, 45, 45);
      } catch {
        try { doc.addImage(selloData, "JPEG", pageW - marginX - 50, y - 25, 45, 45); } catch {}
      }
    }
  }

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