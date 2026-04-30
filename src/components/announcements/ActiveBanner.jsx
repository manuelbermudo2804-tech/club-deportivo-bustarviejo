import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

function variantClasses(variant) {
  switch (variant) {
    case "warning":
      return "bg-yellow-50 border-yellow-200 text-yellow-900";
    case "success":
      return "bg-green-50 border-green-200 text-green-900";
    case "danger":
      return "bg-red-50 border-red-200 text-red-900";
    default:
      return "bg-blue-50 border-blue-200 text-blue-900";
  }
}

function BannerList({ items, onDismiss }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2 mb-3">
      {items.map((a) => (
        <Alert key={a.id} className={`${variantClasses(a.banner_variant)} relative`}> 
          <AlertDescription>
            <div className="font-semibold mb-1">{a.titulo}</div>
            <div className="text-sm leading-relaxed">{a.contenido}</div>
          </AlertDescription>
          {a.banner_dismissible && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onDismiss(a)}
              className="absolute right-2 top-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </Alert>
      ))}
    </div>
  );
}

export default function ActiveBanner({ user, position = "top" }) {
  const { data = [] } = useActiveBanners(user);
  const [dismissedIds, setDismissedIds] = React.useState(() => {
    // Inicializar con los ya descartados en localStorage
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
      if (list.length === 0) return true; // todos
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

  return <BannerList items={filtered} onDismiss={handleDismiss} />;
}