import { base44 } from "@/api/base44Client";

/**
 * Publica un mensaje en los canales seleccionados.
 * Devuelve { resultados: [{canal, ok, error?}], telegramMessageId }
 */
export async function publicarEnCanales({ canales, texto, imageUrl, titulo }) {
  const resultados = [];
  let telegramMessageId = null;

  if (canales.includes("telegram")) {
    try {
      const html = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const { data } = await base44.functions.invoke("publishToTelegramAdvanced", {
        message: html,
        image_url: imageUrl,
        parse_mode: "HTML",
      });
      if (data?.success) {
        telegramMessageId = String(data.message_id || "");
        resultados.push({ canal: "telegram", ok: true });
      } else {
        resultados.push({ canal: "telegram", ok: false, error: data?.error || "Error al publicar" });
      }
    } catch (e) {
      resultados.push({ canal: "telegram", ok: false, error: e?.message || "Error" });
    }
  }

  if (canales.includes("app")) {
    try {
      await base44.entities.Announcement.create({
        titulo: titulo || "Novedad del club",
        contenido: texto,
        prioridad: "Normal",
        destinatarios_tipo: "Todos",
        publicado: true,
        fecha_publicacion: new Date().toISOString(),
      });
      resultados.push({ canal: "app", ok: true });
    } catch (e) {
      resultados.push({ canal: "app", ok: false, error: e?.message || "Error" });
    }
  }

  if (canales.includes("instagram")) {
    if (!imageUrl) {
      resultados.push({ canal: "instagram", ok: false, error: "Instagram necesita una imagen. Genera o sube una foto." });
    } else {
      try {
        const { data } = await base44.functions.invoke("publishToInstagram", {
          caption: texto,
          image_url: imageUrl,
        });
        if (data?.success) {
          resultados.push({ canal: "instagram", ok: true });
        } else {
          resultados.push({ canal: "instagram", ok: false, error: data?.error || "Error al publicar" });
        }
      } catch (e) {
        resultados.push({ canal: "instagram", ok: false, error: e?.message || "Instagram no está conectado" });
      }
    }
  }

  if (canales.includes("facebook")) {
    try {
      const { data } = await base44.functions.invoke("publishToFacebookPage", {
        message: texto,
        image_url: imageUrl,
      });
      if (data?.success) {
        resultados.push({ canal: "facebook", ok: true });
      } else {
        resultados.push({ canal: "facebook", ok: false, error: data?.error || "Error al publicar" });
      }
    } catch (e) {
      resultados.push({ canal: "facebook", ok: false, error: e?.message || "Facebook no está conectado" });
    }
  }

  // Canales manuales: dejar el texto en el portapapeles
  const manuales = canales.filter((c) => c === "whatsapp");
  if (manuales.length) {
    try {
      await navigator.clipboard.writeText(texto);
      manuales.forEach((c) => resultados.push({ canal: c, ok: true, copiado: true }));
    } catch {
      manuales.forEach((c) => resultados.push({ canal: c, ok: false, error: "No se pudo copiar" }));
    }
  }

  return { resultados, telegramMessageId };
}