import { jsPDF } from "jspdf";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const GREEN = [21, 128, 61];
const ORANGE = [234, 88, 12];
const DARK = [30, 41, 59];

const loadLogo = async () => {
  try {
    const blob = await (await fetch(LOGO_URL)).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  } catch { return null; }
};

const fmt = (d) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const COLS = [
  { t: "Nº", x: 14 }, { t: "Nombre y apellidos", x: 24 }, { t: "Fecha nac.", x: 118 }, { t: "DNI / NIE", x: 144 }, { t: "Menor", x: 180 },
];

// porCat: { categoria: [{ nombre, nacimiento, dni, menor }] }
export async function generarListadoInscritosPdf({ temporada, porCat, total, menores }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  const W = 210, H = 297;
  let y = 0;

  const header = (first) => {
    doc.setFillColor(...GREEN); doc.rect(0, 0, W, first ? 38 : 20, "F");
    doc.setFillColor(...ORANGE); doc.rect(0, first ? 38 : 20, W, 1.5, "F");
    if (logo) doc.addImage(logo, "JPEG", 12, first ? 5 : 3, first ? 28 : 14, first ? 28 : 14);
    doc.setTextColor(255, 255, 255);
    const tx = first ? 46 : 30;
    doc.setFont("helvetica", "bold"); doc.setFontSize(first ? 16 : 11);
    doc.text("CLUB DEPORTIVO BUSTARVIEJO", tx, first ? 15 : 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(first ? 11 : 9);
    doc.text(`Relación de deportistas inscritos · Temporada ${temporada}`, tx, first ? 23 : 15);
    if (first) { doc.setFontSize(8.5); doc.text("Documentación para la justificación de la subvención municipal", tx, 30); }
    y = first ? 48 : 30;
  };

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240); doc.line(14, H - 14, W - 14, H - 14);
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text(`CD Bustarviejo · Generado el ${new Date().toLocaleDateString("es-ES")}`, 14, H - 9);
      doc.text(`Página ${i} de ${pages}`, W - 14, H - 9, { align: "right" });
    }
  };

  const ensure = (need) => { if (y + need > H - 20) { doc.addPage(); header(false); } };

  header(true);

  // Resumen
  const cats = Object.keys(porCat).sort();
  const boxes = [["Deportistas", total], ["Menores de 18", menores], ["Mayores de edad", total - menores], ["Categorías", cats.length]];
  const bw = (W - 28 - 9) / 4;
  boxes.forEach(([l, v], i) => {
    const x = 14 + i * (bw + 3);
    doc.setFillColor(240, 253, 244); doc.setDrawColor(187, 247, 208); doc.roundedRect(x, y, bw, 18, 2, 2, "FD");
    doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(String(v), x + bw / 2, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(l, x + bw / 2, y + 14.5, { align: "center" });
  });
  y += 26;

  cats.forEach((cat) => {
    const rows = porCat[cat];
    ensure(22);
    doc.setFillColor(...DARK); doc.roundedRect(14, y, W - 28, 8, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(cat, 17, y + 5.4); doc.text(`${rows.length} deportistas`, W - 17, y + 5.4, { align: "right" });
    y += 10;
    const colHeader = () => {
      doc.setFontSize(8); doc.setTextColor(...ORANGE); doc.setFont("helvetica", "bold");
      COLS.forEach((c) => doc.text(c.t, c.x, y + 3.5));
      doc.setDrawColor(...ORANGE); doc.line(14, y + 5, W - 14, y + 5);
      y += 7;
    };
    colHeader();
    rows.forEach((r, i) => {
      if (y + 6.5 > H - 20) { doc.addPage(); header(false); colHeader(); }
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 0.5, W - 28, 6.5, "F"); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...DARK);
      doc.text(String(i + 1), COLS[0].x, y + 4);
      doc.text(doc.splitTextToSize(r.nombre || "", 92)[0], COLS[1].x, y + 4);
      doc.text(fmt(r.nacimiento), COLS[2].x, y + 4);
      doc.text(r.dni || "—", COLS[3].x, y + 4);
      doc.text(r.menor ? "Sí" : "No", COLS[4].x, y + 4);
      y += 6.5;
    });
    y += 5;
  });

  footer();
  doc.save(`Listado_inscritos_${temporada}.pdf`);
}