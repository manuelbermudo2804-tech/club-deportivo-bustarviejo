import jsPDF from "jspdf";

const ORANGE = [234, 88, 12];
const RED = [200, 30, 30];
const DARK = [30, 30, 30];
const GRAY = [90, 90, 90];

const CIF = "G-80877673";
const CONTACTO = "C.D.BUSTARVIEJO@HOTMAIL.ES";

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

// Genera la Memoria institucional narrativa (formato oficial CD Bustarviejo).
// draft = textos editables; data = datos agregados; logoUrl = escudo del club.
export async function generateClubMemoryPDF(draft, data, logoUrl) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 22;
  const contentW = pageW - marginX * 2;
  const logoData = await loadImageAsDataUrl(logoUrl);
  const temporadaTxt = data?.periodo?.etiqueta?.replace("Temporada ", "") || "";

  let y = 0;
  let firstContentDrawn = false;

  // ---- Cabecera (escudo + banda naranja) en cada página ----
  const drawHeader = () => {
    if (logoData) {
      try { doc.addImage(logoData, "JPEG", marginX - 6, 8, 26, 26); }
      catch { try { doc.addImage(logoData, "PNG", marginX - 6, 8, 26, 26); } catch {} }
    }
    doc.setFillColor(...ORANGE);
    doc.rect(marginX + 26, 14, contentW - 26, 13, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("CLUB DEPORTIVO BUSTARVIEJO", marginX + 32, 22.5);
  };

  // ---- Pie (CIF + contacto) en cada página ----
  const drawFooter = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...RED);
    doc.text("CLUB DEPORTIVO BUSTARVIEJO", pageW / 2, pageH - 16, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`CIF: ${CIF}`, pageW / 2, pageH - 12, { align: "center" });
    doc.text(`Contacto: ${CONTACTO}`, pageW / 2, pageH - 8.5, { align: "center" });
  };

  const newPage = () => {
    doc.addPage();
    drawHeader();
    drawFooter();
    y = 40;
  };

  const ensureSpace = (h) => {
    if (y + h > pageH - 24) newPage();
  };

  // Texto justificado multilínea
  const writeParagraph = (text, opts = {}) => {
    if (!text) return;
    const fontSize = opts.fontSize || 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...(opts.color || DARK));
    const lines = doc.splitTextToSize(text, contentW);
    const lineH = fontSize * 0.42 + 1.4;
    lines.forEach((ln) => {
      ensureSpace(lineH);
      doc.text(ln, marginX, y, { align: "justify", maxWidth: contentW });
      y += lineH;
    });
    y += 2.5;
  };

  // Encabezado de sección romano (I., II., ...)
  const sectionTitle = (text) => {
    ensureSpace(16);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(text.toUpperCase(), marginX, y);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.5);
    doc.line(marginX, y + 1.5, marginX + contentW, y + 1.5);
    y += 9;
  };

  // Subtítulo (grupo, actividad)
  const subTitle = (text) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ORANGE);
    doc.text(text, marginX, y);
    y += 6;
  };

  const bullet = (text) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(text, contentW - 6);
    const lineH = 10.5 * 0.42 + 1.4;
    lines.forEach((ln, i) => {
      ensureSpace(lineH);
      if (i === 0) {
        doc.setFillColor(...ORANGE);
        doc.circle(marginX + 1.5, y - 1.4, 0.9, "F");
      }
      doc.text(ln, marginX + 6, y);
      y += lineH;
    });
    y += 1;
  };

  // ============ PÁGINA 1: cabecera + título ============
  drawHeader();
  drawFooter();
  y = 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text(`Memoria temporada ${temporadaTxt}`, pageW / 2, y, { align: "center" });
  y += 16;

  // ---- INTRODUCCIÓN ----
  if (draft.introduccion) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("INTRODUCCIÓN", pageW / 2, y, { align: "center" });
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.3);
    const tw = doc.getTextWidth("INTRODUCCIÓN");
    doc.line(pageW / 2 - tw / 2, y + 1, pageW / 2 + tw / 2, y + 1);
    y += 9;
    writeParagraph(draft.introduccion);
    firstContentDrawn = true;
  }

  // ---- I. DISCIPLINAS DEPORTIVAS Y GRUPOS ----
  const grupos = draft.grupos || [];
  if (draft.disciplinas_intro || grupos.length) {
    sectionTitle("I. Disciplinas deportivas y grupos");
    if (draft.disciplinas_intro) writeParagraph(draft.disciplinas_intro);
    grupos.forEach((g) => {
      subTitle(g.nombre);
      const meta = [];
      if (g.responsables) meta.push(`Responsables: ${g.responsables}`);
      if (g.colaboradores) meta.push(`Colaboradores: ${g.colaboradores}`);
      if (g.competicion) meta.push(g.competicion);
      if (g.posicion) meta.push(`Posición final: ${g.posicion}`);
      if (typeof g.integrantes === "number") meta.push(`${g.integrantes} integrantes`);
      if (meta.length) writeParagraph(meta.join("  ·  "), { fontSize: 10, color: GRAY });
      if (g.texto) writeParagraph(g.texto);
    });
  }

  // ---- II. PROGRAMA DE VOLUNTARIADO ----
  if (draft.voluntariado || (draft.voluntariado_objetivos || []).length) {
    sectionTitle("II. Programa de voluntariado");
    if (draft.voluntariado) writeParagraph(draft.voluntariado);
    (draft.voluntariado_objetivos || []).forEach((o) => bullet(o));
  }

  // ---- III. OTRAS ACTIVIDADES ----
  const actividades = draft.otras_actividades || [];
  if (actividades.length) {
    sectionTitle("III. Otras actividades");
    actividades.forEach((a) => {
      if (a.titulo) subTitle(`• ${a.titulo}`);
      if (a.texto) writeParagraph(a.texto);
    });
  }

  // ---- IV. CONCLUSIONES ----
  if (draft.conclusiones || (draft.aspectos_mejorar || []).length) {
    sectionTitle("IV. Conclusiones");
    if (draft.conclusiones) writeParagraph(draft.conclusiones);
    if ((draft.aspectos_mejorar || []).length) {
      subTitle("Aspectos a mejorar:");
      (draft.aspectos_mejorar || []).forEach((a) => bullet(a));
    }
  }

  // ---- FIRMA ----
  ensureSpace(30);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text("En Bustarviejo, a fecha firma.", pageW - marginX, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text(draft.firmante_cargo || "LA PRESIDENTA", pageW - marginX, y, { align: "right" });

  void firstContentDrawn;

  const filename = `Memoria_CD_Bustarviejo_${temporadaTxt.replace(/[/\s]+/g, "_")}.pdf`;
  doc.save(filename);
  return filename;
}