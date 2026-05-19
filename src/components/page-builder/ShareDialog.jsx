import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Download, MessageCircle, Mail, Twitter, Facebook, Linkedin, X } from "lucide-react";
import { toast } from "sonner";

// Modal de compartir con QR descargable + enlaces a redes.
export default function ShareDialog({ open, onClose, url, title }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!open || !url) return;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((dataUrl) => setQrDataUrl(dataUrl)).catch(() => {});
  }, [open, url]);

  if (!open) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${(title || "landing").toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const shareText = encodeURIComponent(`${title || "Échale un vistazo"}: ${url}`);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || "");

  const networks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      url: `https://wa.me/?text=${shareText}`,
    },
    {
      name: "Telegram",
      icon: MessageCircle,
      color: "bg-sky-500 hover:bg-sky-600",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "Twitter / X",
      icon: Twitter,
      color: "bg-slate-900 hover:bg-slate-800",
      url: `https://twitter.com/intent/tweet?text=${shareText}`,
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "bg-blue-700 hover:bg-blue-800",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-slate-600 hover:bg-slate-700",
      url: `mailto:?subject=${encodedTitle}&body=${shareText}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="max-w-lg mx-auto my-8 bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Compartir página</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* URL */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Enlace directo
            </label>
            <div className="flex gap-2">
              <Input value={url} readOnly className="font-mono text-xs" />
              <Button onClick={copyUrl} size="sm" variant="outline" className="gap-1 flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
          </div>

          {/* QR */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Código QR
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 rounded-2xl p-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR" className="w-32 h-32 rounded-xl bg-white p-2 border" />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-white flex items-center justify-center border">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm text-slate-600 mb-3">
                  Imprime el QR en carteles físicos o compártelo en redes.
                </p>
                <Button onClick={downloadQR} size="sm" disabled={!qrDataUrl} className="gap-2">
                  <Download className="w-4 h-4" /> Descargar PNG
                </Button>
              </div>
            </div>
          </div>

          {/* Redes */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Compartir en…
            </label>
            <div className="grid grid-cols-3 gap-2">
              {networks.map((n) => (
                <a
                  key={n.name}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${n.color} text-white rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all hover:scale-105 hover:shadow-lg`}
                >
                  <n.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{n.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}