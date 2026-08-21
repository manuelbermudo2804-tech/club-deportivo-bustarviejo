import React from "react";
import LoteriaAppBanner from "./LoteriaAppBanner";

const DASHBOARD_PAGES = [
  "Home",
  "ParentDashboard",
  "CoachDashboard",
  "CoordinatorDashboard",
  "TreasurerDashboard",
  "PlayerDashboard",
];

// Muestra el banner de lotería en los paneles de inicio de todos los roles,
// excepto en el acceso juvenil (menores).
export default function LoteriaDashboardSlot({ currentPageName, isMinor }) {
  if (isMinor) return null;
  if (!DASHBOARD_PAGES.includes(currentPageName)) return null;

  return (
    <div className="px-4 lg:px-6 pt-4">
      <LoteriaAppBanner />
    </div>
  );
}