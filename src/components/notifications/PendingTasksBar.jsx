import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useStaffCounters, useCoachCounters, useCoordinatorCounters, useFamilyCounters, usePrivateCounters, useAdminCounters } from "../chats/useChatCounters";
import { MessageCircle, ShieldAlert, Users, Briefcase } from "lucide-react";

const Chip = ({ label, count, color, onClick }) => {
  if (!count || count <= 0) return null;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${color} shadow-elegant btn-press`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      {label}
      <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full bg-white/15">{count > 99 ? '99+' : count}</span>
    </button>
  );
};

export default function PendingTasksBar({ notifications }) {
  const navigate = useNavigate();
  const n = notifications || {};
  const total = (n.unreadCoordinatorMessages||0) + (n.unreadCoachMessages||0) + (n.unreadStaffMessages||0) + (n.unreadAdminMessages||0) + (n.unreadPrivateMessages||0);
  // Mostrar siempre la barra si hay staff (coordinadores/entrenadores/admin), aunque otros contadores estén a 0, para evitar parpadeos
  const shouldShow = total > 0 || (n.role === 'admin' || n.isCoordinator || n.isCoach);
  if (!shouldShow) return null;

  return (
    <div className="sticky top-[52px] lg:top-0 z-30 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold text-slate-600 mr-2">Tareas pendientes</span>
        <Chip
          label="Coord."
          count={n.unreadCoordinatorMessages}
          color="bg-blue-600"
          onClick={() => navigate(createPageUrl('FamilyChats'))}
        />
        <Chip
          label="Entrenador"
          count={n.unreadCoachMessages}
          color="bg-red-600"
          onClick={() => navigate(createPageUrl('CoachParentChat'))}
        />
        <Chip
          label="Staff"
          count={n.unreadStaffMessages}
          color="bg-purple-600"
          onClick={() => navigate(createPageUrl('StaffChat'))}
        />
        <Chip
          label="Administrador"
          count={n.unreadAdminMessages}
          color="bg-orange-600"
          onClick={() => navigate(createPageUrl('ParentAdminChat'))}
        />
        <Chip
          label="Privados"
          count={n.unreadPrivateMessages}
          color="bg-slate-700"
          onClick={() => navigate(createPageUrl('DirectMessages'))}
        />
      </div>
    </div>
  );
}