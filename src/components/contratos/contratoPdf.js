import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const toDataUrl = async (url) => {
  const blob = await (await fetch(url)).blob();
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
};

// Genera y descarga el PDF del acuerdo con la firma y el registro de evidencias
export async function descargarContratoPdf(c) {
  const doc = new jsPDF();
  const W = 180;
  let y = 20;
  const ensure = (h) => { if (y + h > 280) { doc.addPage(); y = 20; } };

  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("CD Bustarviejo", 15, y); y += 8;
  doc.setFontSize(12).text(c.titulo || "Acuerdo de voluntariado", 15, y); y += 10;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.splitTextToSize(c.texto || "", W).forEach((line) => { ensure(6); doc.text(line, 15, y); y += 5; });

  if (c.estado === "firmado" && c.firma_uri) {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: c.firma_uri });
    const img = await toDataUrl(signed_url);
    ensure(80); y += 8;
    doc.setFont("helvetica", "bold").text(c.es_menor ? "Firma del menor:" : "Firma del voluntario:", 15, y);
    if (c.es_menor && c.tutor_firma_uri) doc.text(`Firma del tutor (${c.tutor_relacion || ""}):`, 105, y);
    y += 3;
    doc.addImage(img, "PNG", 15, y, 70, 30);
    if (c.es_menor && c.tutor_firma_uri) {
      const t = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: c.tutor_firma_uri });
      doc.addImage(await toDataUrl(t.signed_url), "PNG", 105, y, 70, 30);
    }
    y += 34;
    if (c.es_menor) {
      doc.setFont("helvetica", "normal").setFontSize(8);
      doc.text(`Tutor: ${c.tutor_nombre || ""}   DNI: ${c.tutor_dni || ""}`, 15, y); y += 4;
    }
    doc.setFont("helvetica", "normal").setFontSize(8);
    [
      `Nombre: ${c.firma_nombre || c.entrenador_nombre || ""}   DNI: ${c.firma_dni || ""}`,
      `Email: ${c.entrenador_email}`,
      `Firmado el: ${new Date(c.firma_fecha).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`,
      `Huella del texto (SHA-256): ${c.texto_hash || ""}`,
      `Dispositivo: ${(c.firma_user_agent || "").slice(0, 150)}`,
      `Protección de datos aceptada: ${c.acepta_privacidad ? "Sí" : "No"}`,
      "Firma electrónica simple (Reglamento UE 910/2014 eIDAS) realizada en la app del club.",
    ].forEach((l) => { doc.splitTextToSize(l, W).forEach((s) => { ensure(4); doc.text(s, 15, y); y += 4; }); });
  }
  doc.save(`Acuerdo_voluntariado_${(c.entrenador_nombre || c.entrenador_email).replace(/\s+/g, "_")}.pdf`);
}