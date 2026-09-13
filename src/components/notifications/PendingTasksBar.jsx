import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const Chip = ({ label, count = 0, color, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${color} shadow-elegant btn-press opacity-95`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      {label}
      <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full bg-white/15">{count > 99 ? '99+' : count}</span>
    </button>
  );
};

export default function PendingTasksBar({ notifications, forceShow = false }) {
  const navigate = useNavigate();
  
  // TODOS los contadores vienen de notifications (fuente única)
  const coordTotal = notifications?.unreadCoordinatorMessages || 0;
  const coachTotal = notifications?.unreadCoachMessages || 0;
  const staffTotal = notifications?.unreadStaffMessages || 0;
  const adminTotal = notifications?.unreadAdminMessages || 0;
  const privateTotal = notifications?.unreadPrivateMessages || 0;
  const familyTotal = notifications?.unreadFamilyMessages || 0;

  const role = notifications?.role;
  const isCoordinator = notifications?.isCoordinator;
  const isCoach = notifications?.isCoach;

  const deletionTotal = notifications?.pendingDeletionRequests || 0;
  const total = coordTotal + coachTotal + staffTotal + adminTotal + privateTotal + familyTotal + deletionTotal;
  
  // SIEMPRE mostrar para admin, coordinador y entrenador (aunque no haya mensajes)
  const shouldShow = (forceShow === true) || (role === 'admin' || isCoordinator === true || isCoach === true || total > 0);
  
  if (!shouldShow) return null;

  return (
    <div className="sticky top-[100px] lg:top-0 z-30 bg-gradient-to-r from-green-600 to-green-700 border-b border-green-700/50 text-white">
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold mr-2">
          {notifications?.isPlayer ? 'Mis tareas' : 'Tareas pendientes'}
        </span>
        <Chip
          label="Coord."
          count={coordTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('FamilyChats'))}
        />
        <Chip
          label="Entrenador"
          count={coachTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('CoachParentChat'))}
        />
        <Chip
          label="Staff"
          count={staffTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('StaffChat'))}
        />
        <Chip
          label="Administrador"
          count={adminTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('ParentAdminChat'))}
        />
        {notifications?.role === 'admin' && (
          <Chip
            label="Eliminación"
            count={deletionTotal}
            color="bg-red-600/70"
            onClick={() => navigate(createPageUrl('DeleteAccount'))}
          />
        )}
        <Chip
          label="Privados"
          count={privateTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('DirectMessages'))}
        />
      </div>
    </div>
  );
}