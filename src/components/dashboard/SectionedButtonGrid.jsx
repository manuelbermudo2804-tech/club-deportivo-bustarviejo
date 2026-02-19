import React from "react";
import DashboardButtonCard from "./DashboardButtonCard";

/**
 * Renders dashboard buttons split into two visual sections (role vs club/family).
 * 
 * Props:
 *  - buttons: array of button objects (must have .section field)
 *  - roleSection: key to match for the "role" group (e.g. "coach", "treasurer")
 *  - roleSectionLabel: label shown above role buttons (e.g. "🏋️ Entrenador")
 *  - clubSectionLabel: label shown above club buttons (e.g. "👨‍👩‍👧 Club y Familia")
 *  - badgeMap: optional object { buttonId: { value, label } } for extra badges
 */
export default function SectionedButtonGrid({
  buttons = [],
  roleSection = "coach",
  roleSectionLabel = "🏋️ Entrenador",
  clubSectionLabel = "👨‍👩‍👧 Club y Familia",
  playerSectionLabel = "⚽ Mi Perfil Jugador",
  badgeMap = {},
}) {
  const roleButtons = buttons.filter(b => b.section === roleSection);
  const playerButtons = buttons.filter(b => b.section === "player");
  const clubButtons = buttons.filter(b => b.section === "club");

  const renderSection = (items, label, colorClass) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-px flex-1 ${colorClass}/30`} />
          <span className={`text-xs font-bold ${colorClass} uppercase tracking-wider whitespace-nowrap`}>
            {label}
          </span>
          <div className={`h-px flex-1 ${colorClass}/30`} />
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4 stagger-animation">
          {items.map((item, i) => (
            <DashboardButtonCard
              key={item.id || i}
              item={item}
              extraBadge={badgeMap[item.id] || null}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderSection(roleButtons, roleSectionLabel, "text-blue-400 bg-blue-500")}
      {renderSection(playerButtons, playerSectionLabel, "text-green-400 bg-green-500")}
      {renderSection(clubButtons, clubSectionLabel, "text-orange-400 bg-orange-500")}
    </div>
  );
}