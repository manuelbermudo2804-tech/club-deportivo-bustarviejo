import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Devuelve las landings que el usuario actual puede gestionar y deben verse en el menú lateral.
// Reglas:
//   - Solo landings con panel_gestion.mostrar_en_menu === true
//   - Admin → ve todas
//   - Resto → solo si su email está en panel_gestion.emails_autorizados
export default function useLandingMenuItems(user, isAdmin) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await base44.entities.LandingPage.list();
        if (cancelled) return;
        const visible = (all || []).filter((p) => {
          const pg = p.panel_gestion;
          if (!pg?.mostrar_en_menu) return false;
          if (p.estado === "archivada") return false;
          if (isAdmin) return true;
          const emails = (pg.emails_autorizados || []).map((e) => (e || "").toLowerCase().trim());
          return emails.includes((user.email || "").toLowerCase().trim());
        });
        setItems(visible);
      } catch (err) {
        console.warn("useLandingMenuItems error", err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, isAdmin]);

  return items;
}