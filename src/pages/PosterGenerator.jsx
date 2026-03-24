import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";

const BG_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/b76322ed2_fondo.jpg";
const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/528c07844_logo_cd_bustarviejo_grande.jpg";
const QR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/7ec5ded71_image.png";

export default function PosterGenerator() {
  const posterRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [slogan, setSlogan] = useState("TU CLUB. TU PUEBLO.");

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const images = posterRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) => new Promise((resolve) => {
            if (img.complete) return resolve();
            img.onload = resolve;
            img.onerror = resolve;
          })
        )
      );
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, useCORS: true, allowTaint: false,
        backgroundColor: "#0a0400", width: 794, height: 1123,
        logging: false, imageTimeout: 15000,
      });
      canvas.toBlob((blob) => {
        if (!blob) { setDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "cartel_cd_bustarviejo.png";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png", 1.0);
      return;
    } catch (e) { console.error("Error:", e); }
    setDownloading(false);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🖨️ Cartel de Captación</h1>
          <p className="text-sm text-slate-600 mt-1">Personaliza y descarga en alta calidad</p>
        </div>
        <Button onClick={handleDownload} disabled={downloading}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold px-6 py-3 text-base" size="lg">
          {downloading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando...</> : <><Download className="w-5 h-5 mr-2" /> Descargar Cartel HD</>}
        </Button>
      </div>

      <div className="max-w-md">
        <label className="text-sm font-semibold text-slate-700 mb-1 block">🔥 Frase final del cartel</label>
        <Input value={slogan} onChange={(e) => setSlogan(e.target.value.toUpperCase())} placeholder="TU CLUB. TU PUEBLO." className="font-bold text-lg uppercase" />
        <p className="text-xs text-slate-500 mt-1">Cambia esta frase para cada pueblo</p>
      </div>

      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="flex-shrink-0">
          <div ref={posterRef} style={{
            width: 794, height: 1123, position: "relative", overflow: "hidden",
            fontFamily: "'Georgia', 'Times New Roman', serif", background: "#0a0400",
          }}>
            {/* BG image */}
            <img src={BG_URL} alt="" crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

            {/* FIRE overlay — aggressive warm tones */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(180,60,0,0.45) 0%, rgba(120,40,0,0.30) 25%, rgba(80,20,0,0.35) 50%, rgba(40,10,0,0.60) 75%, rgba(10,2,0,0.92) 100%)",
            }} />
            {/* Hot color burn */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 50% 30%, rgba(255,120,0,0.18) 0%, rgba(200,60,0,0.08) 40%, transparent 70%)",
            }} />
            {/* Vignette */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
            }} />

            {/* ===== DECORATIVE OVAL — fiery glow ===== */}
            <div style={{
              position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
              width: 640, height: 500, borderRadius: "50%",
              border: "3px solid rgba(255,140,30,0.45)",
              boxShadow: "0 0 40px rgba(255,100,0,0.15), inset 0 0 40px rgba(255,100,0,0.08)",
              zIndex: 5,
            }} />
            <div style={{
              position: "absolute", top: "20.6%", left: "50%", transform: "translateX(-50%)",
              width: 618, height: 484, borderRadius: "50%",
              border: "1.5px solid rgba(255,140,30,0.22)",
              zIndex: 5,
            }} />

            {/* Content */}
            <div style={{
              position: "relative", zIndex: 10, height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "44px 50px 36px",
            }}>

              {/* ========== TITLE ========== */}
              <div style={{
                fontSize: 68, fontWeight: 900, color: "#FFD700",
                textAlign: "center", lineHeight: 0.92, letterSpacing: 3,
                textShadow: "0 0 30px rgba(255,150,0,0.6), 0 0 60px rgba(255,100,0,0.3), 0 4px 8px rgba(0,0,0,0.9), 3px 3px 0 rgba(120,50,0,0.8)",
                fontStyle: "italic", marginBottom: 4,
              }}>
                TODO EL CLUB
              </div>
              <div style={{
                fontSize: 40, fontWeight: 800, color: "#FFC850",
                textAlign: "center", letterSpacing: 6,
                textShadow: "0 0 20px rgba(255,150,0,0.5), 0 3px 6px rgba(0,0,0,0.9), 2px 2px 0 rgba(120,50,0,0.7)",
                fontStyle: "italic", marginBottom: 14,
              }}>
                EN TU MÓVIL
              </div>

              {/* ========== Features ========== */}
              <div style={{
                fontSize: 18, color: "#f0cca0", textAlign: "center",
                letterSpacing: 2, fontStyle: "italic",
                textShadow: "0 0 12px rgba(255,120,0,0.3), 0 2px 8px rgba(0,0,0,0.8)",
                lineHeight: 1.7, marginBottom: 18,
              }}>
                Partidos &nbsp;·&nbsp; Resultados &nbsp;·&nbsp; Goleadores<br />
                Socios &nbsp;·&nbsp; Inscripciones &nbsp;·&nbsp; Tienda
              </div>

              {/* ========== LOGO with fire glow ========== */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <div style={{
                  position: "absolute", inset: -16, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,140,0,0.25) 0%, rgba(255,80,0,0.10) 50%, transparent 70%)",
                  filter: "blur(8px)",
                }} />
                <img src={LOGO_URL} alt="CD Bustarviejo" crossOrigin="anonymous"
                  style={{
                    width: 155, height: 155, objectFit: "contain", borderRadius: 12, position: "relative",
                    filter: "drop-shadow(0 0 20px rgba(255,120,0,0.4)) drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
                  }} />
              </div>

              {/* ========== ESCANEA Y DESCÚBRELO ========== */}
              <div style={{
                fontSize: 30, fontWeight: 900, color: "#FFD700",
                textAlign: "center", letterSpacing: 4,
                textShadow: "0 0 25px rgba(255,150,0,0.5), 0 0 50px rgba(255,80,0,0.2), 0 3px 8px rgba(0,0,0,0.9), 2px 2px 0 rgba(100,40,0,0.7)",
                marginBottom: 18,
              }}>
                ESCANEA Y DESCÚBRELO
              </div>

              {/* ========== QR (INTOCABLE) ========== */}
              <div style={{
                background: "white", borderRadius: 10, padding: 8,
                boxShadow: "0 0 30px rgba(255,100,0,0.25), 0 12px 40px rgba(0,0,0,0.5)",
                marginBottom: 20,
              }}>
                <img src={QR_URL} alt="QR" crossOrigin="anonymous"
                  style={{ width: 210, height: 210, display: "block" }} />
              </div>

              {/* ========== WEB & EMAIL ========== */}
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 18 }}>🌐</span>
                  <span style={{
                    fontSize: 18, color: "#f0cca0", letterSpacing: 1.5,
                    textShadow: "0 0 10px rgba(255,120,0,0.3), 0 2px 6px rgba(0,0,0,0.7)",
                  }}>www.cdbustarviejo.com</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>✉</span>
                  <span style={{
                    fontSize: 18, color: "#f0cca0", letterSpacing: 1.5,
                    textShadow: "0 0 10px rgba(255,120,0,0.3), 0 2px 6px rgba(0,0,0,0.7)",
                  }}>info@cdbustarviejo.com</span>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* ========== FIRE DIVIDER ========== */}
              <div style={{
                width: 300, height: 2, marginBottom: 14,
                background: "linear-gradient(90deg, transparent, rgba(255,140,0,0.7), rgba(255,200,0,0.9), rgba(255,140,0,0.7), transparent)",
                boxShadow: "0 0 12px rgba(255,120,0,0.4)",
              }} />

              {/* ========== SLOGAN — FIRE TREATMENT ========== */}
              <div style={{
                fontSize: 38, fontWeight: 900, color: "#FFD700",
                letterSpacing: 6, textAlign: "center",
                textShadow: "0 0 30px rgba(255,150,0,0.6), 0 0 60px rgba(255,80,0,0.3), 0 4px 8px rgba(0,0,0,0.9), 3px 3px 0 rgba(120,50,0,0.8)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}>
                {slogan || "TU CLUB. TU PUEBLO."}
              </div>
            </div>

            {/* Top fire bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 5,
              background: "linear-gradient(90deg, transparent 3%, rgba(255,80,0,0.6) 20%, rgba(255,160,0,0.9) 50%, rgba(255,80,0,0.6) 80%, transparent 97%)",
              boxShadow: "0 2px 20px rgba(255,100,0,0.4)",
            }} />
            {/* Bottom fire bar */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 5,
              background: "linear-gradient(90deg, transparent 3%, rgba(255,80,0,0.6) 20%, rgba(255,160,0,0.9) 50%, rgba(255,80,0,0.6) 80%, transparent 97%)",
              boxShadow: "0 -2px 20px rgba(255,100,0,0.4)",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}