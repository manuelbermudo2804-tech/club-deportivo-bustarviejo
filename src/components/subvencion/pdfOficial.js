import { jsPDF } from "jspdf";
import { CLUB } from "@/components/subvencion/clubDatos";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const GREEN = [21, 128, 61];
const ORANGE = [234, 88, 12];
const DARK = [30, 41, 59];
const W = 210, H = 297, M = 18, CW = W - M * 2;

const loadLogo = async () => {
  try {
    const blob = await (await fetch(LOGO_URL)).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  } catch { return null; }
};

/**
 * Documento oficial con membrete del club, listo para firmar.
 * bloques: { tipo: "p", texto, bold } | { tipo: "tabla", cols: [{ t, w, align }], filas: [[...]], total: [...] } | { tipo: "firma" }
 */
export async function descargarDocumentoOficial({ titulo, subtitulo, bloques, filename }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  let y = 0;

  const membrete = () => {
    if (logo) doc.addImage(logo, "JPEG", M, 10, 22, 22);
    doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(CLUB.nombre, M + 27, 17);
    doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`CIF: ${CLUB.cif}`, M + 27, 23);
    doc.text(CLUB.domicilio, M + 27, 28);
    doc.setDrawColor(...ORANGE); doc.setLineWidth(0.8); doc.line(M, 36, W - M, 36); doc.setLineWidth(0.2);
    y = 46;
  };
  const ensure = (need) => { if (y + need > H - 22) { doc.addPage(); membrete(); } };

  membrete();
  doc.setTextColor(...DARK); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.splitTextToSize(titulo, CW).forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 6; });
  if (subtitulo) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.text(subtitulo, W / 2, y, { align: "center" }); y += 6; }
  y += 6;

  bloques.forEach((b) => {
    if (b.tipo === "p") {
      doc.setFont("helvetica", b.bold ? "bold" : "normal"); doc.setFontSize(10.5); doc.setTextColor(...DARK);
      doc.splitTextToSize(b.texto, CW).forEach((l) => { ensure(6); doc.text(l, M, y); y += 5.6; });
      y += 3;
    }
    if (b.tipo === "tabla") {
      const xs = []; let x = M; b.cols.forEach((c) => { xs.push(x); x += c.w; });
      const fila = (celdas, estilo) => {
        const lines = celdas.map((c, i) => doc.splitTextToSize(String(c ?? ""), b.cols[i].w - 4));
        const h = Math.max(...lines.map((l) => l.length)) * 4.8 + 4;
        ensure(h);
        if (estilo === "head") { doc.setFillColor(...DARK); doc.rect(M, y, CW, h, "F"); doc.setTextColor(255, 255, 255); }
        else if (estilo === "total") { doc.setFillColor(240, 253, 244); doc.rect(M, y, CW, h, "F"); doc.setTextColor(...GREEN); }
        else { doc.setTextColor(...DARK); }
        doc.setFont("helvetica", estilo ? "bold" : "normal"); doc.setFontSize(9.5);
        lines.forEach((ls, i) => {
          const c = b.cols[i];
          ls.forEach((l, k) => doc.text(l, c.align === "right" ? xs[i] + c.w - 2 : xs[i] + 2, y + 5.5 + k * 4.8, { align: c.align === "right" ? "right" : "left" }));
        });
        doc.setDrawColor(203, 213, 225); doc.rect(M, y, CW, h);
        y += h;
      };
      fila(b.cols.map((c) => c.t), "head");
      b.filas.forEach((f) => fila(f));
      if (b.total) fila(b.total, "total");
      y += 6;
    }
    if (b.tipo === "firma") {
      ensure(50);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...DARK);
      doc.text(`En Bustarviejo, a ____ de ____________________ de ${new Date().getFullYear()}.`, M, y + 4);
      y += 34;
      doc.line(M, y, M + 70, y);
      doc.setFont("helvetica", "bold"); doc.text("El Presidente", M, y + 6);
      doc.setFont("helvetica", "normal"); doc.text(CLUB.presidente, M, y + 11.5); doc.text("Club Deportivo Bustarviejo", M, y + 17);
      y += 22;
    }
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`${CLUB.nombre} · ${CLUB.email}`, M, H - 10);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 10, { align: "right" });
  }
  doc.save(filename);
}