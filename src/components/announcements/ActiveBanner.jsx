import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";

function useActiveBanners(user) {
  return useQuery({
    queryKey: ["announcements", "banners"],
    queryFn: async () => {
      const list = await base44.entities.Announcement.list();
      return Array.isArray(list) ? list : [];
    },
    staleTime: 60_000,
  });
}

function isExpired(a) {
  try {
    if (a?.tipo_caducidad === "fecha" && a?.fecha_expiracion) {
      return new Date(a.fecha_expiracion).getTime() < Date.now();
    }
    if (a?.tipo_caducidad === "horas" && a?.fecha_caducidad_calculada) {
      return new Date(a.fecha_caducidad_calculada).getTime() < Date.now();
    }
  } catch {}
  return false;
}

const VARIANT_STYLES = {
  warning: { bg: "from-amber-500 to-orange-600", text: "text-white", border: "border-amber-300" },
  success: { bg: "from-emerald-500 to-green-600", text: "text-white", border: "border-emerald-300" },
  danger: { bg: "from-red-500 to-rose-600", text: "text-white", border: "border-red-300" },
  info: { bg: "from-blue-500 to-indigo-600", text: "text-white", border: "border-blue-300" },
};

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(target).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const Cell = ({ n, l }) => (
    <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[44px]">
      <span className="text-lg font-bold leading-tight tabular-nums">{String(n).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase opacity-80 leading-none">{l}</span>
    </div>
  );
  return (
    <div className="flex gap-1.5 mt-2">
      {days > 0 && <Cell n={days} l="días" />}
      <Cell n={hours} l="h" />
      <Cell n={mins} l="min" />
      {days === 0 && <Cell n={secs} l="seg" />}
    </div>
  );
}

function BannerCard({ a, onDismiss }) {
  const v = VARIANT_STYLES[a.banner_variant] || VARIANT_STYLES.info;
  const hasImage = !!a.banner_imagen_url;
  const hasCta = !!(a.banner_cta_texto && a.banner_cta_url);

  const handleCta = (e) => {
    e.preventDefault();
    const url = a.banner_cta_url;
    if (!url) return;
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener");
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-lg border ${v.border} bg-gradient-to-r ${v.bg} ${v.text} mb-3`}>
      {hasImage && (
        <>
          <img src={a.banner_imagen_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className={`absolute inset-0 bg-gradient-to-r ${v.bg} opacity-80`} />
        </>
      )}
      <div className="relative p-4 pr-10">
        <div className="font-bold text-base md:text-lg leading-tight">{a.titulo}</div>
        {a.contenido && <div className="text-sm opacity-95 leading-snug mt-1 whitespace-pre-line">{a.contenido}</div>}
        {a.banner_cuenta_atras_fecha && <Countdown target={a.banner_cuenta_atras_fecha} />}
        {hasCta && (
          <Button
            onClick={handleCta}
            size="sm"
            className="mt-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-md"
          >
            {a.banner_cta_texto} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
      {a.banner_dismissible && (
        <button
          type="button"
          onClick={() => onDismiss(a)}
          className="absolute right-2 top-2 p-1.5 rounded-full hover:bg-white/20 transition"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function ActiveBanner({ user, position = "top" }) {
  const { data = [] } = useActiveBanners(user);
  const [dismissedIds, setDismissedIds] = useState(() => {
    const set = new Set();
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("announcement_dismissed_")) set.add(k.replace("announcement_dismissed_", ""));
      });
    } catch {}
    return set;
  });

  const email = user?.email?.toLowerCase();
  const filtered = (data || [])
    .filter((a) => a?.publicado !== false && a?.mostrar_como_banner === true && a?.banner_activo === true)
    .filter((a) => !isExpired(a))
    .filter((a) => {
      const list = Array.isArray(a.destinatarios_emails) ? a.destinatarios_emails.map((e) => (e || "").toLowerCase().trim()) : [];
      if (list.length === 0) return true;
      if (!email) return false;
      return list.includes(email);
    })
    .filter((a) => (position === "top" ? a.banner_posicion !== "bottom" : a.banner_posicion === "bottom"))
    .filter((a) => !dismissedIds.has(a.id));

  const handleDismiss = (a) => {
    try { localStorage.setItem(`announcement_dismissed_${a.id}`, "1"); } catch {}
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(a.id);
      return next;
    });
  };

  if (!filtered.length) return null;

  return (
    <div className="px-3 pt-2">
      {filtered.map((a) => (
        <BannerCard key={a.id} a={a} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}