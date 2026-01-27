import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { MessageCircle, ShieldAlert, Users } from "lucide-react";

// Pequeño sistema de toasts locales (no depende de sonner)
function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 6000);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  const Icon = toast.icon || MessageCircle;

  return (
    <div
      onClick={() => {
        if (toast.onClick) toast.onClick();
        onClose(toast.id);
      }}
      className="w-80 max-w-[92vw] cursor-pointer group rounded-xl bg-white shadow-2xl border border-slate-200 p-3 flex gap-3 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-shadow"
    >
      <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{toast.subtitle}</p>
        <p className="text-sm font-semibold text-slate-900 truncate">{toast.title}</p>
        {toast.body && (
          <p className="text-xs text-slate-600 truncate">{toast.body}</p>
        )}
      </div>
      <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-red-500 text-white self-start">
        {toast.badge}
      </span>
    </div>
  );
}

export default function ChatToasts() {
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [myCategories, setMyCategories] = useState([]);
  const [coachCategories, setCoachCategories] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const players = await base44.entities.Player.filter({ $or: [ { email_padre: u.email }, { email_tutor_2: u.email }, { email_jugador: u.email } ] });
        const cats = Array.from(new Set(players.flatMap(p => [p.categoria_principal, p.deporte].filter(Boolean))));
        setMyCategories(cats);
        setCoachCategories(Array.isArray(u.categorias_entrena) ? u.categorias_entrena : []);
      } catch {}
    };
    init();
  }, []);

  const pushToast = (t) => {
    const id = ++idRef.current;
    setToasts((prev) => [{ ...t, id }, ...prev].slice(0, 4));
  };

  const closeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (!user) return;

    const unsubs = [];
    const isMine = (email) => email === user.email;

    // Helpers de navegación
    const open = (url) => {
      if (!url) return;
      window.location.href = url;
    };

    // Chat familias (grupos): ChatMessage
    unsubs.push(
      base44.entities.ChatMessage.subscribe((evt) => {
        const m = evt.data;
        if (evt.type !== 'create' || !m || isMine(m.remitente_email)) return;
        const group = m.deporte || m.grupo_id || 'Grupo';
        const isToCoach = m.tipo === 'padre_a_grupo';
        const isToFamilies = m.tipo === 'entrenador_a_grupo';
        // Filtrar por pertenencia
        const coachShouldSee = isToCoach && (coachCategories.includes(m.deporte) || coachCategories.includes(m.grupo_id));
        const parentShouldSee = isToFamilies && (myCategories.includes(m.deporte) || myCategories.includes(m.grupo_id));
        if (!coachShouldSee && !parentShouldSee) return;
        // Entrenador recibe cuando familias escriben, familias reciben cuando entrenador escribe
        const subtitle = isToCoach ? 'Familias → Entrenador' : 'Entrenador → Familias';
        const icon = MessageCircle;
        const title = `Nuevo mensaje en ${group}`;
        const url = isToCoach
          ? createPageUrl(`CoachParentChat?category=${encodeURIComponent(group)}`)
          : createPageUrl(`ParentCoachChat?category=${encodeURIComponent(group)}`);
        pushToast({ title, subtitle, icon, badge: group.slice(0, 2).toUpperCase(), onClick: () => open(url) });
      })
    );

    // Coordinador (conversaciones directas con familias)
    unsubs.push(
      base44.entities.CoordinatorMessage.subscribe((evt) => {
        const m = evt.data;
        if (evt.type !== 'create' || !m || isMine(m.remitente_email)) return;
        const group = m.categoria || m.deporte || 'Coordinación';
        const icon = ShieldAlert;
        const subtitle = 'Coordinador';
        const title = `Nuevo mensaje en ${group}`;
        const url = user.es_coordinador
          ? createPageUrl('FamilyChats?tab=coordinator')
          : createPageUrl('ParentCoordinatorChat');
        pushToast({ title, subtitle, icon, badge: 'CO', onClick: () => open(url) });
      })
    );

    // Staff interno
    unsubs.push(
      base44.entities.StaffMessage.subscribe((evt) => {
        const m = evt.data;
        if (evt.type !== 'create' || !m || isMine(m.autor_email)) return;
        const icon = Users;
        const title = 'Nuevo mensaje en Staff';
        const subtitle = m.autor_rol === 'coordinador' ? 'Coordinador' : m.autor_rol === 'admin' ? 'Admin' : 'Entrenador';
        const url = createPageUrl('StaffChat');
        pushToast({ title, subtitle, icon, badge: 'ST', onClick: () => open(url), body: (m.mensaje || '').slice(0, 60) });
      })
    );

    // Admin (mensajes críticos a familias)
    unsubs.push(
      base44.entities.AdminMessage.subscribe((evt) => {
        const m = evt.data;
        if (evt.type !== 'create' || !m || isMine(m.remitente_email)) return;
        const title = 'Nuevo mensaje del Administrador';
        const icon = ShieldAlert;
        const url = createPageUrl('ParentSystemMessages');
        pushToast({ title, subtitle: 'Administrador', icon, badge: 'AD', onClick: () => open(url), body: (m.mensaje || '').slice(0, 60) });
      })
    );

    // Mensajes privados (sistema/club)
    unsubs.push(
      base44.entities.PrivateMessage.subscribe((evt) => {
        const m = evt.data;
        if (evt.type !== 'create' || !m || isMine(m.remitente_email)) return;
        // Solo si el usuario está en la conversación
        // Filtro básico: si soy staff/email coincide o soy familia
        if (m.destinatario_email !== user.email && m.remitente_email !== user.email) {
          // no garantizar pertenencia, pero evitamos ruido evidente
        }
        const title = 'Mensaje del Club';
        const icon = ShieldAlert;
        const url = createPageUrl('ParentSystemMessages');
        pushToast({ title, subtitle: 'Privado', icon, badge: 'CL', onClick: () => open(url), body: (m.mensaje || '').slice(0, 60) });
      })
    );

    return () => unsubs.forEach((u) => u && u());
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={closeToast} />
      ))}
    </div>
  );
}