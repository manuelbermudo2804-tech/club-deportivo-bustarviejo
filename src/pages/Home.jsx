import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Bell, Settings, ClipboardCheck, CheckCircle2, TrendingUp, Star } from "lucide-react";

import { AttendanceChart, PaymentStatusChart, CallupConfirmationChart } from "../components/dashboard/StatsChart";
import QuickActions from "../components/dashboard/QuickActions";
import Onboarding from "../components/Onboarding";
import AutomaticReminders from "../components/AutomaticReminders";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [userRole, setUserRole] = useState("parent");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const adminCheck = currentUser.role === "admin";
        const coachCheck = currentUser.es_entrenador === true && !adminCheck;
        setIsAdmin(adminCheck);
        setIsCoach(coachCheck);

        if (adminCheck) setUserRole("admin");
        else if (coachCheck) setUserRole("coach");
        else setUserRole("parent");

        if (adminCheck || currentUser.es_entrenador) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === currentUser.email || 
            p.email_tutor_2 === currentUser.email
          );
          setHasPlayers(myPlayers.length > 0);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const activePlayers = players.filter(p => p.activo).length;
  const pendingPayments = payments.filter(p => p.estado === "Pendiente").length;
  const unreadMessages = messages.filter(m => !m.leido && m.tipo === "padre_a_grupo").length;

  const pendingCallupsCount = () => {
    if (!user || !hasPlayers) return 0;
    
    const myPlayers = players.filter(p => 
      p.email_padre === user.email || 
      p.email_tutor_2 === user.email
    );
    
    const today = new Date().toISOString().split('T')[0];
    let pending = 0;
    
    callups.forEach(callup => {
      if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
        callup.jugadores_convocados?.forEach(jugador => {
          const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
          if (isMyPlayer && jugador.confirmacion === "pendiente") {
            pending++;
          }
        });
      }
    });
    
    return pending;
  };

  // Prepare chart data
  const prepareAttendanceData = () => {
    const monthlyData = {};
    attendances.forEach(att => {
      const month = att.fecha.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { presentes: 0, ausentes: 0, justificados: 0 };
      }
      att.asistencias.forEach(a => {
        if (a.estado === "presente") monthlyData[month].presentes++;
        else if (a.estado === "ausente") monthlyData[month].ausentes++;
        else if (a.estado === "justificado") monthlyData[month].justificados++;
      });
    });
    
    return Object.keys(monthlyData).slice(-6).map(month => ({
      mes: month.substring(5),
      ...monthlyData[month]
    }));
  };

  const preparePaymentData = () => {
    const pending = payments.filter(p => p.estado === "Pendiente").length;
    const review = payments.filter(p => p.estado === "En revisión").length;
    const paid = payments.filter(p => p.estado === "Pagado").length;
    
    return [
      { name: "Pagado", value: paid },
      { name: "En Revisión", value: review },
      { name: "Pendiente", value: pending }
    ];
  };

  const prepareCallupData = () => {
    const categories = {};
    callups.forEach(callup => {
      if (!categories[callup.categoria]) {
        categories[callup.categoria] = { confirmados: 0, pendientes: 0, noAsistiran: 0 };
      }
      callup.jugadores_convocados?.forEach(j => {
        if (j.confirmacion === "asistire") categories[callup.categoria].confirmados++;
        else if (j.confirmacion === "pendiente") categories[callup.categoria].pendientes++;
        else if (j.confirmacion === "no_asistire") categories[callup.categoria].noAsistiran++;
      });
    });
    
    return Object.keys(categories).map(cat => ({
      categoria: cat.replace(/Fútbol |Baloncesto |\(Mixto\)/g, "").trim(),
      ...categories[cat]
    }));
  };

  const quickActions = [
    { title: "Evaluaciones", icon: "⭐", url: createPageUrl("PlayerEvaluations"), badge: 0 },
    { title: "Asistencia", icon: "✅", url: createPageUrl("CoachAttendance"), badge: 0 },
    { title: "Convocatorias", icon: "🏆", url: createPageUrl("CoachCallups"), badge: pendingCallupsCount() },
    { title: "Pagos", icon: "💰", url: createPageUrl("Payments"), badge: pendingPayments }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {user && <Onboarding userRole={userRole} />}
      <AutomaticReminders />
      
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 shadow-xl">
        <div className="flex items-center justify-center gap-4">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-16 h-16 rounded-2xl shadow-2xl ring-4 ring-white/50" />
          <div className="text-white text-center">
            <h1 className="text-3xl font-bold">CD Bustarviejo</h1>
            <p className="text-orange-100">
              {isAdmin ? "Panel de Administración" : isCoach ? "Panel de Entrenadores" : "Panel de Gestión"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🚀 Accesos Rápidos</h2>
          <QuickActions actions={quickActions} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-orange-200">
            <Users className="w-8 h-8 text-orange-600 mb-2" />
            <div className="text-3xl font-bold text-slate-900">{activePlayers}</div>
            <div className="text-slate-600 text-sm">Jugadores Activos</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-200">
            <CreditCard className="w-8 h-8 text-red-600 mb-2" />
            <div className="text-3xl font-bold text-slate-900">{pendingPayments}</div>
            <div className="text-slate-600 text-sm">Pagos Pendientes</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
            <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-slate-900">{payments.filter(p => p.estado === "Pagado").length}</div>
            <div className="text-slate-600 text-sm">Pagos Confirmados</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
            <MessageCircle className="w-8 h-8 text-blue-600 mb-2" />
            <div className="text-3xl font-bold text-slate-900">{unreadMessages}</div>
            <div className="text-slate-600 text-sm">Mensajes Nuevos</div>
          </div>
        </div>

        {/* Charts */}
        {(isAdmin || isCoach) && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">📊 Estadísticas</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AttendanceChart data={prepareAttendanceData()} />
                <PaymentStatusChart data={preparePaymentData()} />
              </div>
            </div>
            
            <CallupConfirmationChart data={prepareCallupData()} />
          </>
        )}
      </div>
    </div>
  );
}