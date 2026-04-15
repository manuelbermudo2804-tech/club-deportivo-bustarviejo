import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Home } from "lucide-react";

export default function BackToAppButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) setShow(true);
    }).catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <a
      href="/"
      className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
    >
      <Home className="w-4 h-4" />
      Volver a la app
    </a>
  );
}