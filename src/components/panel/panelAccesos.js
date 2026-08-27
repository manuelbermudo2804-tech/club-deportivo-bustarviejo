import { ALL_COORDINATOR_BUTTONS } from "@/components/dashboard/CoordinatorDashboardButtons";
import { ALL_COACH_BUTTONS } from "@/components/dashboard/CoachDashboardButtons";

// Los chats no van aquí: viven en la bandeja única de mensajes
const EXCLUIR_IDS = [
  "chat_familias_coord", "chat_familias_entrenador", "chat_staff", "chat_familias", "asistente",
];

const dedupe = (buttons) => {
  const seen = new Set();
  return buttons.filter((b) => {
    if (seen.has(b.url)) return false;
    seen.add(b.url);
    return true;
  });
};

const visible = (b, ctx) => {
  if (EXCLUIR_IDS.includes(b.id)) return false;
  if (!b.conditional) return true;
  return ctx[b.conditionKey] === true;
};

/**
 * Accesos agrupados por área de trabajo, no por rol.
 * ctx: { hasPlayers, loteriaVisible, isCoachToo, canManageSignatures, isPlayer }
 */
export function buildAccesos(ctx = {}) {
  const trabajo = dedupe([
    ...ALL_COORDINATOR_BUTTONS.filter((b) => b.section === "coordinator"),
    ...ALL_COACH_BUTTONS.filter((b) => b.section === "coach"),
  ]).filter((b) => visible(b, ctx));

  const familia = ALL_COORDINATOR_BUTTONS
    .filter((b) => b.section === "club")
    .filter((b) => visible(b, ctx));

  const misHijosIds = ["mis_hijos", "pagos_hijos", "confirmar_hijos", "firmas_hijos", "tienda"];

  return [
    { titulo: "🧢 Equipo y coordinación", color: "text-blue-400", items: trabajo },
    { titulo: "👨‍👩‍👧 Mi familia", color: "text-green-400", items: familia.filter((b) => misHijosIds.includes(b.id)) },
    { titulo: "🏟️ Vida del club", color: "text-orange-400", items: familia.filter((b) => !misHijosIds.includes(b.id)) },
  ].filter((s) => s.items.length > 0);
}