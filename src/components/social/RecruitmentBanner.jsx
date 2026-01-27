import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Megaphone, Share2, Copy, MessageSquareQuote, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

export default function RecruitmentBanner({
  url = "https://alta-socio.vercel.app/jugadores.html",
  title = "Captación de jugadores",
  subtitle = "Comparte y ayúdanos a atraer nuevos jugadores al club",
  theme = "orange"
}) {
  const [qrDataUrl, setQrDataUrl] = React.useState("");
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, { width: 160, margin: 1 });
        setQrDataUrl(dataUrl);
      } catch (e) {
        // ignore QR errors silently
      }
    })();
  }, [url]);

  const shareWhatsApp = (text) => {
    const message = text?.trim() ? `${text}\n${url}` : `¡Únete a nuestro club! Apúntate aquí: ${url}`;
    base44.analytics.track({ eventName: "recruitment_whatsapp_clicked" });
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    base44.analytics.track({ eventName: "recruitment_copy_link" });
    // Simple feedback
    alert("Enlace copiado");
  };

  const openForm = () => {
    base44.analytics.track({ eventName: "recruitment_open_form" });
    window.open(url, "_blank");
  };

  const suggestWithAI = async () => {
    setLoadingAI(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          "Eres un copywriter del club. Genera 3 mensajes MUY breves, juveniles y entusiastas (máx 120 caracteres) para invitar por WhatsApp a apuntarse como jugador. Español (España). Devuelve solo JSON con {\"messages\": string[]}",
        response_json_schema: {
          type: "object",
          properties: {
            messages: { type: "array", items: { type: "string" } }
          },
          required: ["messages"],
        },
      });
      const msgs = res?.messages || res?.data?.messages || [];
      setSuggestions(Array.isArray(msgs) ? msgs.slice(0, 3) : []);
      base44.analytics.track({ eventName: "recruitment_ai_suggest" });
    } catch (e) {
      // fallback
      setSuggestions([
        "¡Únete al equipo! Inscríbete aquí",
        "¿Te apuntas a jugar con nosotros?",
        "¡Súmate al club!"
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-elegant bg-gradient-to-r ${
        theme === "orange"
          ? "from-orange-100 via-amber-100 to-yellow-100"
          : "from-slate-50 to-slate-100"
      }`}
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_40%)]" />

      <div className="relative p-4 sm:p-5 md:p-6 flex items-center gap-4 sm:gap-6">
        <div className="hidden sm:flex h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/80 items-center justify-center shadow-elegant">
          <Megaphone className="w-6 h-6 text-orange-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 line-clamp-2">
            {subtitle}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => shareWhatsApp("")}
              className="bg-green-600 hover:bg-green-700 h-9 px-3"
            >
              <Share2 className="w-4 h-4 mr-2" /> Compartir WhatsApp
            </Button>

            <Button variant="outline" onClick={copyLink} className="h-9 px-3">
              <Copy className="w-4 h-4 mr-2" /> Copiar enlace
            </Button>

            <Button variant="outline" onClick={openForm} className="h-9 px-3">
              <ExternalLink className="w-4 h-4 mr-2" /> Abrir formulario
            </Button>

            <Button
              variant="secondary"
              onClick={suggestWithAI}
              disabled={loadingAI}
              className="h-9 px-3"
            >
              <MessageSquareQuote className="w-4 h-4 mr-2" /> {loadingAI ? "Generando…" : "IA: sugerir texto"}
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {suggestions.map((s, idx) => (
                <div key={idx} className="bg-white/80 border rounded-lg p-2 text-xs flex items-center justify-between gap-2">
                  <span className="truncate" title={s}>{s}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => shareWhatsApp(s)}>
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(`${s} \n${url}`)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {qrDataUrl && (
          <div className="hidden md:block">
            <img src={qrDataUrl} alt="QR captación" className="h-24 w-24 rounded-md border bg-white p-1" />
          </div>
        )}
      </div>
    </Card>
  );
}