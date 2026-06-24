import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const ORANGE = [234, 88, 12];
const ORANGE_LIGHT = [251, 146, 60];
const GREEN = [21, 128, 61];
const DARK = [15, 23, 42];
const GRAY = [100, 116, 139];
const LIGHT_BG = [255, 247, 237];

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
  } catch {
    return null;
  }
};

const fmtFecha = (f) => {
  try { return format(parseISO(f), "d MMM yyyy", { locale: es }); } catch { return f || ""; }
};

const eur = (n) => `${(n || 0).toLocaleString("es-ES")} €`;

export async function generateClubMemoryPDF(data, logoUrl) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const logoData = await loadImageAsDataUrl(logoUrl);

  let y = 0;

  // ============ PORTADA ============
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, pageH, "F");
  // Banda naranja superior
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 6, "F");
  doc.setFillColor(...GREEN);
  doc.rect(0, pageH - 6, pageW, 6, "F");

  if (logoData) {
    try { doc.addImage(logoData, "JPEG", pageW / 2 - 25, 55, 50, 50); }
    catch { try { doc.addImage(logoData, "PNG", pageW / 2 - 25, 55, 50, 50); } catch {} }
  }

  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor(255, 255, 255);
  doc.text("MEMORIA ANUAL", pageW / 2, 135, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(...ORANGE_LIGHT);
  doc.text("CD BUSTARVIEJO", pageW / 2, 150, { align: "center" });

  // Caja periodo
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageW / 2 - 45, 165, 90, 18, 3, 3, "S");
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(data.periodo?.etiqueta || "", pageW / 2, 177, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("Club Deportivo · Bustarviejo · Madrid", pageW / 2, 270, { align: "center" });
  doc.text(`Generada el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, pageW / 2, 277, { align: "center" });

  // ============ PÁGINA 2: RESUMEN EN NÚMEROS ============
  doc.addPage();
  y = drawSectionHeader(doc, "El club en números", marginX, pageW);

  const sec = data.secciones || null;
  const inc = (k) => (sec ? sec[k] !== false : true);

  const kpis = [];
  if (inc("jugadores")) {
    kpis.push({ label: "Jugadores", value: data.jugadores?.total ?? 0, color: ORANGE });
    kpis.push({ label: "Equipos", value: data.jugadores?.equipos ?? 0, color: GREEN });
    kpis.push({ label: "Jugadoras femenino", value: data.jugadores?.femenino ?? 0, color: [219, 39, 119] });
  }
  if (inc("socios")) kpis.push({ label: "Socios", value: data.socios?.total ?? 0, color: [37, 99, 235] });
  if (inc("eventos")) kpis.push({ label: "Eventos", value: data.eventos?.total ?? 0, color: [124, 58, 237] });
  if (inc("patrocinadores")) kpis.push({ label: "Patrocinadores", value: (data.patrocinadores || []).length, color: [13, 148, 136] });
  if (data.sanIsidro) kpis.push({ label: "San Isidro (inscritos)", value: data.sanIsidro.inscritos ?? 0, color: ORANGE });
  if (data.porra) kpis.push({ label: "Porra (apuestas)", value: data.porra.pagados ?? 0, color: GREEN });
  if (data.mercadillo) kpis.push({ label: "Mercadillo (anuncios)", value: data.mercadillo.anuncios ?? 0, color: [37, 99, 235] });
  if (data.voluntariado) kpis.push({ label: "Voluntariado (personas)", value: data.voluntariado.personas ?? 0, color: [219, 39, 119] });

  const cardW = (pageW - marginX * 2 - 12) / 3;
  const cardH = 30;
  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = marginX + col * (cardW + 6);
    const cy = y + row * (cardH + 6);
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...k.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");
    doc.setFont("times", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...k.color);
    doc.text(String(k.value), x + cardW / 2, cy + 14, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(k.label, x + cardW / 2, cy + 23, { align: "center" });
  });
  const kpiRows = Math.ceil(kpis.length / 3);
  y += kpiRows * (cardH + 6) + 8;

  // ===== INGRESOS =====
  if (inc("ingresos")) {
    y = drawSubHeader(doc, "Ingresos del periodo", marginX, y, pageW);
    doc.setFillColor(...GREEN);
    doc.roundedRect(marginX, y, pageW - marginX * 2, 22, 2, 2, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(eur(data.ingresos?.total), marginX + 8, y + 14);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Total ingresos registrados", marginX + 8, y + 19.5);
    y += 28;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(`· Cuotas y pagos: ${eur(data.ingresos?.cuotas)}  (${data.ingresos?.num_pagos || 0} pagos)`, marginX + 4, y);
    y += 7;
    doc.text(`· Patrocinios: ${eur(data.ingresos?.patrocinio)}`, marginX + 4, y);
    y += 12;
  }

  // ===== ACTIVIDADES DEL CLUB (San Isidro, Porra, Mercadillo, Voluntariado) =====
  const actividades = [];
  if (data.sanIsidro) actividades.push(`· San Isidro: ${data.sanIsidro.inscritos} inscritos · ${data.sanIsidro.voluntarios} voluntarios`);
  if (data.porra) actividades.push(`· Porra/Torneo: ${data.porra.pagados} apuestas pagadas · ${eur(data.porra.recaudado)} recaudados`);
  if (data.mercadillo) actividades.push(`· Mercadillo solidario: ${data.mercadillo.anuncios} anuncios publicados`);
  if (data.voluntariado) actividades.push(`· Voluntariado: ${data.voluntariado.personas} personas · ${data.voluntariado.inscripciones} inscripciones`);
  if (actividades.length) {
    if (y > pageH - 50) { doc.addPage(); y = 25; }
    y = drawSubHeader(doc, "Actividades y eventos del club", marginX, y, pageW);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    actividades.forEach((line) => {
      if (y > pageH - 18) { doc.addPage(); y = 25; }
      doc.text(line, marginX + 4, y);
      y += 7;
    });
    y += 6;
  }

  // ===== CATEGORIAS =====
  if ((data.jugadores?.categorias || []).length) {
    y = drawSubHeader(doc, "Jugadores por categoría", marginX, y, pageW);
    data.jugadores.categorias.forEach((c) => {
      if (y > pageH - 25) { doc.addPage(); y = 25; }
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(c.nombre, marginX + 4, y);
      // barra
      const maxBar = 70;
      const maxCount = data.jugadores.categorias[0].count || 1;
      const barW = Math.max(2, (c.count / maxCount) * maxBar);
      doc.setFillColor(...ORANGE_LIGHT);
      doc.roundedRect(pageW - marginX - maxBar - 12, y - 3.5, barW, 4.5, 1, 1, "F");
      doc.setFont("times", "bold");
      doc.setTextColor(...ORANGE);
      doc.text(String(c.count), pageW - marginX - 6, y, { align: "right" });
      y += 7;
    });
    y += 6;
  }

  // ============ PATROCINADORES ============
  const sponsors = data.patrocinadores || [];
  if (sponsors.length) {
    if (y > pageH - 60) { doc.addPage(); y = 25; }
    y = drawSubHeader(doc, "Patrocinadores y colaboradores", marginX, y, pageW);
    for (const s of sponsors) {
      if (y > pageH - 22) { doc.addPage(); y = 25; }
      const logoSp = await loadImageAsDataUrl(s.logo_url);
      if (logoSp) {
        try { doc.addImage(logoSp, "JPEG", marginX + 2, y - 5, 16, 12); }
        catch { try { doc.addImage(logoSp, "PNG", marginX + 2, y - 5, 16, 12); } catch {} }
      }
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(s.nombre || "", marginX + 22, y);
      if (s.nivel) {
        doc.setFont("times", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(s.nivel, marginX + 22, y + 4.5);
      }
      y += 14;
    }
    y += 4;
  }

  // ============ EVENTOS Y LOGROS ============
  const eventos = data.eventos?.lista || [];
  if (eventos.length) {
    if (y > pageH - 50) { doc.addPage(); y = 25; }
    y = drawSubHeader(doc, "Eventos del periodo", marginX, y, pageW);
    eventos.forEach((e) => {
      if (y > pageH - 18) { doc.addPage(); y = 25; }
      doc.setFont("times", e.importante ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(...(e.importante ? ORANGE : DARK));
      const fechaTxt = fmtFecha(e.fecha);
      doc.text(`${fechaTxt}  ·  ${e.titulo}`, marginX + 4, y);
      doc.setFont("times", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(e.tipo || "", pageW - marginX - 4, y, { align: "right" });
      y += 6.5;
    });
    y += 6;
  }

  // ============ GALERÍA ============
  const fotos = data.fotos?.destacadas || [];
  if (fotos.length) {
    doc.addPage();
    y = drawSectionHeader(doc, "Galería del año", marginX, pageW);
    const gW = (pageW - marginX * 2 - 8) / 2;
    const gH = 55;
    let idx = 0;
    for (const url of fotos) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = marginX + col * (gW + 8);
      const cy = y + row * (gH + 8);
      if (cy > pageH - gH - 10) break;
      const imgData = await loadImageAsDataUrl(url);
      if (imgData) {
        try {
          doc.setDrawColor(...ORANGE_LIGHT);
          doc.setLineWidth(0.5);
          doc.roundedRect(x, cy, gW, gH, 2, 2, "S");
          doc.addImage(imgData, "JPEG", x + 1, cy + 1, gW - 2, gH - 2);
        } catch {
          try { doc.addImage(imgData, "PNG", x + 1, cy + 1, gW - 2, gH - 2); } catch {}
        }
      }
      idx++;
    }
  }

  // Pie en todas las páginas (excepto portada)
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("times", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("CD Bustarviejo · Memoria Anual · www.cdbustarviejo.com", pageW / 2, pageH - 8, { align: "center" });
    doc.text(`${p - 1}`, pageW - marginX, pageH - 8, { align: "right" });
  }

  const filename = `Memoria_CD_Bustarviejo_${(data.periodo?.etiqueta || "").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
  return filename;
}

function drawSectionHeader(doc, title, marginX, pageW) {
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(title, marginX, 13);
  return 32;
}

function drawSubHeader(doc, title, marginX, y, pageW) {
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...ORANGE);
  doc.text(title, marginX, y);
  doc.setDrawColor(...ORANGE_LIGHT);
  doc.setLineWidth(0.5);
  doc.line(marginX, y + 2, pageW - marginX, y + 2);
  return y + 10;
}