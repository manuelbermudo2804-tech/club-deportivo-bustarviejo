import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Calcula el nivel de confianza de una solicitud de acceso
 * cruzándola con los jugadores ya inscritos y los usuarios existentes.
 *
 * 🟢 VERDE  → El email o nombre coincide con un tutor de jugador activo, o ya hay un usuario en la app
 * 🟡 AMARILLO → No hay match directo, pero la categoría existe / el dominio del email es común
 * 🔴 ROJO   → Sin ningún indicio de pertenencia al club + señales sospechosas
 */
function normalize(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function firstAndLast(fullName) {
  const parts = normalize(fullName).split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  return { first: parts[0], last: parts[parts.length - 1] };
}

export function calculateTrust(request, { players = [], users = [] } = {}) {
  const email = normalize(request.email);
  const name = normalize(request.nombre_progenitor);
  const nameParts = firstAndLast(request.nombre_progenitor);
  const reasons = [];

  // 1. Email coincide EXACTAMENTE con tutor de un jugador activo
  const emailMatchPlayer = players.find(p =>
    p.activo !== false && (
      normalize(p.email_padre) === email ||
      normalize(p.email_tutor_2) === email ||
      normalize(p.email_jugador) === email
    )
  );
  if (emailMatchPlayer) {
    reasons.push(`✅ El email coincide con el tutor de ${emailMatchPlayer.nombre}`);
    return { level: "green", reasons, score: 100 };
  }

  // 2. Email ya está registrado como usuario de la app
  const userMatch = users.find(u => normalize(u.email) === email);
  if (userMatch) {
    reasons.push(`⚠️ Este email YA tiene cuenta en la app (${userMatch.full_name || userMatch.email})`);
    return { level: "yellow", reasons, score: 50 };
  }

  // 3. Nombre coincide con un tutor (nombre + 1er apellido)
  if (nameParts) {
    const nameMatch = players.find(p => {
      if (p.activo === false) return false;
      const tutor1 = firstAndLast(p.nombre_tutor_legal);
      const tutor2 = firstAndLast(p.nombre_tutor_2);
      return (
        (tutor1 && tutor1.first === nameParts.first && tutor1.last === nameParts.last) ||
        (tutor2 && tutor2.first === nameParts.first && tutor2.last === nameParts.last)
      );
    });
    if (nameMatch) {
      reasons.push(`🟡 El nombre coincide con un tutor de ${nameMatch.nombre}, pero NO el email`);
      return { level: "yellow", reasons, score: 60 };
    }
  }

  // 4. La categoría que indica existe en el club (al menos sabe el nombre real)
  const knownCategory = request.categoria && request.categoria !== "No lo sé aún";
  const someoneInCategory = players.some(p =>
    p.activo !== false && (p.categoria_principal === request.categoria || p.deporte === request.categoria)
  );

  if (knownCategory && someoneInCategory) {
    reasons.push("🟡 La categoría existe en el club, pero no hay match de email ni nombre");
    return { level: "yellow", reasons, score: 40 };
  }

  // 5. Sin match alguno
  if (!knownCategory) reasons.push("🔴 No ha indicado categoría concreta");
  if (!someoneInCategory && knownCategory) reasons.push("🔴 No hay nadie inscrito en esa categoría");
  reasons.push("🔴 Email y nombre no coinciden con ningún tutor existente");
  return { level: "red", reasons, score: 10 };
}

export default function AccessRequestTrustIndicator({ request, players, users }) {
  const trust = calculateTrust(request, { players, users });

  const config = {
    green: {
      icon: ShieldCheck,
      label: "Familia del club",
      className: "bg-green-100 text-green-700 border-green-300",
    },
    yellow: {
      icon: ShieldAlert,
      label: "Revisar",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    red: {
      icon: ShieldX,
      label: "Sospechosa",
      className: "bg-red-100 text-red-700 border-red-300",
    },
  }[trust.level];

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} text-xs gap-1 cursor-help`}>
            <Icon className="w-3 h-3" />
            {config.label}
            <Info className="w-3 h-3 opacity-60" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-bold text-xs mb-1">Análisis de confianza</p>
          <ul className="text-xs space-y-0.5">
            {trust.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}