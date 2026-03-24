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
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve();
              img.onload = resolve;
              img.onerror = resolve;
            })
        )
      );

      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#1a0f05",
        width: 794,
        height: 1123,
        logging: false,
        imageTimeout: 15000,
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloading(false);
          return;
        }
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
    } catch (e) {
      console.error("Error generando imagen:", e);
    }
    setDownloading(false);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🖨️ Cartel de Captación</h1>
          <p className="text-sm text-slate-600 mt-1">Personaliza el slogan y descarga el cartel en alta calidad</p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold px-6 py-3 text-base"
          size="lg"
        >
          {downloading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando...</>
          ) : (
            <><Download className="w-5 h-5 mr-2" /> Descargar Cartel HD</>
          )}
        </Button>
      </div>

      {/* Editable slogan */}
      <div className="max-w-md">
        <label className="text-sm font-semibold text-slate-700 mb-1 block">Frase final del cartel</label>
        <Input
          value={slogan}
          onChange={(e) => setSlogan(e.target.value.toUpperCase())}
          placeholder="TU CLUB. TU PUEBLO."
          className="font-bold text-lg uppercase"
        />
        <p className="text-xs text-slate-500 mt-1">Cambia esta frase para adaptar el cartel a cada pueblo</p>
      </div>

      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="flex-shrink-0">
          {/* ====== POSTER A4: 794×1123 ====== */}
          <div
            ref={posterRef}
            style={{
              width: 794,
              height: 1123,
              position: "relative",
              overflow: "hidden",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              background: "#1a0f05",
            }}
          >
            {/* Background image */}
            <img
              src={BG_URL}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Dark warm overlay - sepia vintage feel */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(60,30,10,0.55) 0%, rgba(80,40,15,0.40) 30%, rgba(50,25,8,0.45) 55%, rgba(30,15,5,0.70) 80%, rgba(10,5,0,0.88) 100%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(120, 70, 30, 0.15)",
              mixBlendMode: "color",
            }} />

            {/* ===== DECORATIVE OVAL RING ===== */}
            <div style={{
              position: "absolute",
              top: "22%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 620,
              height: 480,
              border: "3px solid rgba(180,120,50,0.4)",
              borderRadius: "50%",
              zIndex: 5,
            }} />
            <div style={{
              position: "absolute",
              top: "22.5%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 465,
              border: "1.5px solid rgba(180,120,50,0.25)",
              borderRadius: "50%",
              zIndex: 5,
            }} />

            {/* Content */}
            <div style={{
              position: "relative",
              zIndex: 10,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "50px 56px 40px",
            }}>

              {/* ========== TITLE: TODO EL CLUB EN TU MOVIL ========== */}
              <div style={{
                fontSize: 62,
                fontWeight: 900,
                color: "#f0d8a0",
                textAlign: "center",
                lineHeight: 0.95,
                letterSpacing: 2,
                textShadow: "0 4px 24px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9), 3px 3px 0 rgba(40,20,5,0.7)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontStyle: "italic",
                marginBottom: 6,
              }}>
                TODO EL CLUB
              </div>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#e8cdb0",
                textAlign: "center",
                letterSpacing: 4,
                textShadow: "0 3px 16px rgba(0,0,0,0.8), 2px 2px 0 rgba(40,20,5,0.6)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontStyle: "italic",
                marginBottom: 16,
              }}>
                EN TU MÓVIL
              </div>

              {/* ========== Subtitle features ========== */}
              <div style={{
                fontSize: 18,
                color: "#d4b896",
                textAlign: "center",
                letterSpacing: 2,
                fontStyle: "italic",
                textShadow: "0 2px 10px rgba(0,0,0,0.7)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}>
                Partidos &nbsp;·&nbsp; Resultados &nbsp;·&nbsp; Goleadores<br />
                Socios &nbsp;·&nbsp; Inscripciones &nbsp;·&nbsp; Tienda
              </div>

              {/* ========== LOGO ========== */}
              <img
                src={LOGO_URL}
                alt="CD Bustarviejo"
                crossOrigin="anonymous"
                style={{
                  width: 165,
                  height: 165,
                  objectFit: "contain",
                  borderRadius: 12,
                  filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6))",
                  marginBottom: 20,
                }}
              />

              {/* ========== ESCANEA Y DESCÚBRELO ========== */}
              <div style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#f0d8a0",
                textAlign: "center",
                letterSpacing: 3,
                textShadow: "0 3px 20px rgba(0,0,0,0.8), 2px 2px 0 rgba(40,20,5,0.6)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                marginBottom: 22,
              }}>
                ESCANEA Y DESCÚBRELO
              </div>

              {/* ========== QR CODE (NO TOCAR) ========== */}
              <div style={{
                background: "white",
                borderRadius: 12,
                padding: 10,
                boxShadow: "0 12px 48px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
                marginBottom: 24,
              }}>
                <img
                  src={QR_URL}
                  alt="QR"
                  crossOrigin="anonymous"
                  style={{ width: 220, height: 220, display: "block" }}
                />
              </div>

              {/* ========== WEB & EMAIL ========== */}
              <div style={{
                textAlign: "center",
                marginBottom: 8,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 18, color: "#c8a882" }}>🌐</span>
                  <span style={{
                    fontSize: 19,
                    color: "#e0c8a8",
                    letterSpacing: 1.5,
                    fontWeight: 400,
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}>
                    www.cdbustarviejo.com
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}>
                  <span style={{ fontSize: 18, color: "#c8a882" }}>✉</span>
                  <span style={{
                    fontSize: 19,
                    color: "#e0c8a8",
                    letterSpacing: 1.5,
                    fontWeight: 400,
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}>
                    info@cdbustarviejo.com
                  </span>
                </div>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* ========== SLOGAN (editable) ========== */}
              <div style={{
                fontSize: 36,
                fontWeight: 900,
                color: "#f0d8a0",
                letterSpacing: 5,
                textShadow: "0 3px 20px rgba(0,0,0,0.8), 2px 2px 0 rgba(40,20,5,0.6)",
                textAlign: "center",
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}>
                {slogan || "TU CLUB. TU PUEBLO."}
              </div>
            </div>

            {/* Top accent line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 4,
              background: "linear-gradient(90deg, transparent 5%, rgba(180,120,50,0.5) 30%, rgba(200,150,70,0.7) 50%, rgba(180,120,50,0.5) 70%, transparent 95%)",
            }} />
            {/* Bottom accent line */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
              background: "linear-gradient(90deg, transparent 5%, rgba(180,120,50,0.5) 30%, rgba(200,150,70,0.7) 50%, rgba(180,120,50,0.5) 70%, transparent 95%)",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}