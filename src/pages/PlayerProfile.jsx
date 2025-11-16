import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  User, CreditCard, Bell, Star, MessageCircle, FileText, 
  ArrowLeft, Phone, Mail, Calendar, AlertCircle, Edit, Plus,
  TrendingUp, Award, Clock, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

import MemberNoteForm from "../components/members/MemberNoteForm";
import MemberNoteCard from "../components/members/MemberNoteCard";

export default function PlayerProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerId = searchParams.get("id");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === "admin");
      setIsCoach(currentUser.es_entrenador === true);

      // Si es jugador y no hay ID, buscar su propio perfil
      if (currentUser.role === "jugador" && !playerId) {
        const allPlayers = await base44.entities.Player.list();
        const myPlayer = allPlayers.find(p => p.email_jugador === currentUser.email);
        if (myPlayer) {
          navigate(createPageUrl("PlayerProfile") + `?id=${myPlayer.id}`, { replace: true });
        }
      }
    };
    fetchUser();
  }, [playerId, navigate]);

  const { data: player, isLoading: loadingPlayer } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const players = await base44.entities.Player.list();
      return players.find(p => p.id === playerId);
    },
    enabled: !!playerId,
  });

  const { data: payments } = useQuery({
    queryKey: ['playerPayments', playerId],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      return allPayments.filter(p => p.jugador_id === playerId);
    },
    enabled: !!playerId,
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['playerCallups', playerId],
    queryFn: async () => {
      const allCallups = await base44.entities.Convocatoria.list('-created_date');
      return allCallups.filter(c => 
        c.jugadores_convocados?.some(j => j.jugador_id === playerId)
      );
    },
    enabled: !!playerId,
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['playerEvaluations', playerId],
    queryFn: async () => {
      const allEvals = await base44.entities.PlayerEvaluation.list('-created_date');
      return allEvals.filter(e => e.jugador_id === playerId);
    },
    enabled: !!playerId,
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['playerMessages', player?.deporte],
    queryFn: async () => {
      const allMessages = await base44.entities.ChatMessage.list('-created_date');
      return allMessages.filter(m => m.grupo_id === player?.deporte || m.deporte === player?.deporte);
    },
    enabled: !!player?.deporte,
    initialData: [],
  });

  const { data: notes } = useQuery({
    queryKey: ['playerNotes', playerId],
    queryFn: async () => {
      const allNotes = await base44.entities.MemberNote.list('-created_date');
      return allNotes.filter(n => n.jugador_id === playerId && !n.archivada);
    },
    enabled: !!playerId && (isAdmin || isCoach),
    initialData: [],
  });

  const { data: attendance } = useQuery({
    queryKey: ['playerAttendance', playerId],
    queryFn: async () => {
      const allAttendance = await base44.entities.Attendance.list('-fecha');
      return allAttendance.filter(a => 
        a.asistencias?.some(asist => asist.jugador_id === playerId)
      );
    },
    enabled: !!playerId && (isAdmin || isCoach),
    initialData: [],
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.MemberNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerNotes'] });
      setShowNoteForm(false);
      toast.success("Nota añadida correctamente");
    },
  });

  if (loadingPlayer || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6">
        <Card className="border-orange-300">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <p className="text-slate-600">Jugador no encontrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentStats = {
    total: payments.length,
    pagados: payments.filter(p => p.estado === "Pagado").length,
    pendientes: payments.filter(p => p.estado === "Pendiente").length,
    enRevision: payments.filter(p => p.estado === "En revisión").length,
  };

  const callupStats = {
    total: callups.length,
    confirmados: callups.filter(c => {
      const playerCallup = c.jugadores_convocados?.find(j => j.jugador_id === playerId);
      return playerCallup?.confirmacion === "asistire";
    }).length,
    pendientes: callups.filter(c => {
      const playerCallup = c.jugadores_convocados?.find(j => j.jugador_id === playerId);
      return playerCallup?.confirmacion === "pendiente";
    }).length,
  };

  const avgEvaluation = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5), 0) / evaluations.length).toFixed(1)
    : "N/A";

  const attendanceStats = attendance.reduce((acc, a) => {
    const playerAtt = a.asistencias?.find(asist => asist.jugador_id === playerId);
    if (playerAtt) {
      if (playerAtt.estado === "presente") acc.presente++;
      else if (playerAtt.estado === "ausente") acc.ausente++;
      else if (playerAtt.estado === "justificado") acc.justificado++;
    }
    return acc;
  }, { presente: 0, ausente: 0, justificado: 0 });

  const attendancePercentage = attendance.length > 0
    ? ((attendanceStats.presente / attendance.length) * 100).toFixed(0)
    : "N/A";

  const handleAddNote = (noteData) => {
    createNoteMutation.mutate({
      ...noteData,
      jugador_id: playerId,
      jugador_nombre: player.nombre,
      autor_email: user.email,
      autor_nombre: user.full_name,
    });
  };

  const backUrl = isAdmin || isCoach ? createPageUrl("Players") : createPageUrl("PlayerDashboard");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to={backUrl}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Perfil del Jugador</h1>
          <p className="text-slate-600">Vista completa del historial y actividad</p>
        </div>
      </div>

      <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-orange-100">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {player.foto_url ? (
              <img 
                src={player.foto_url} 
                alt={player.nombre}
                className="w-24 h-24 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{player.nombre}</h2>
                  <p className="text-orange-700 font-semibold">{player.deporte}</p>
                </div>
                <Badge className={player.activo ? "bg-green-500" : "bg-slate-400"}>
                  {player.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-600">Fecha Nac.</p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {player.fecha_nacimiento ? format(new Date(player.fecha_nacimiento), "dd/MM/yyyy") : "N/A"}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-600">Teléfono</p>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{player.telefono || "N/A"}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-600">Email Padre</p>
                  </div>
                  <p className="font-semibold text-slate-900 text-xs truncate">{player.email_padre}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-600">Tipo</p>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{player.tipo_inscripcion}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{paymentStats.pagados}/{paymentStats.total}</p>
                <p className="text-xs text-slate-600">Pagos Realizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{callupStats.confirmados}/{callupStats.total}</p>
                <p className="text-xs text-slate-600">Convocatorias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{avgEvaluation}</p>
                <p className="text-xs text-slate-600">Media Evaluación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{attendancePercentage}%</p>
                <p className="text-xs text-slate-600">Asistencia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="payments">💰 Pagos ({payments.length})</TabsTrigger>
          <TabsTrigger value="callups">🏆 Convocatorias ({callups.length})</TabsTrigger>
          <TabsTrigger value="evaluations">⭐ Evaluaciones ({evaluations.length})</TabsTrigger>
          <TabsTrigger value="messages">💬 Mensajes ({messages.length})</TabsTrigger>
          {(isAdmin || isCoach) && <TabsTrigger value="attendance">📋 Asistencia ({attendance.length})</TabsTrigger>}
          {(isAdmin || isCoach) && <TabsTrigger value="notes">📝 Notas ({notes.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {payments.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay pagos registrados</p>
              </CardContent>
            </Card>
          ) : (
            payments.map(payment => (
              <Card key={payment.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={
                          payment.estado === "Pagado" ? "bg-green-500" :
                          payment.estado === "Pendiente" ? "bg-red-500" :
                          "bg-orange-500"
                        }>
                          {payment.estado}
                        </Badge>
                        <p className="text-sm text-slate-600">{payment.mes} - {payment.temporada}</p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{payment.cantidad}€</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Tipo: {payment.tipo_pago} • {format(new Date(payment.created_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="callups" className="mt-4 space-y-3">
          {callups.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay convocatorias</p>
              </CardContent>
            </Card>
          ) : (
            callups.map(callup => {
              const playerCallup = callup.jugadores_convocados?.find(j => j.jugador_id === playerId);
              return (
                <Card key={callup.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{callup.titulo}</h3>
                        <p className="text-sm text-slate-600">{callup.categoria}</p>
                      </div>
                      <Badge className={
                        playerCallup?.confirmacion === "asistire" ? "bg-green-500" :
                        playerCallup?.confirmacion === "no_asistire" ? "bg-red-500" :
                        playerCallup?.confirmacion === "duda" ? "bg-yellow-500" :
                        "bg-slate-400"
                      }>
                        {playerCallup?.confirmacion || "N/A"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-slate-600">📅 {format(new Date(callup.fecha_partido), "dd/MM/yyyy")} - {callup.hora_partido}</p>
                      <p className="text-slate-600">📍 {callup.ubicacion}</p>
                    </div>
                    {playerCallup?.comentario && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                        💬 {playerCallup.comentario}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4 space-y-3">
          {evaluations.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay evaluaciones</p>
              </CardContent>
            </Card>
          ) : (
            evaluations.map(evaluation => (
              <Card key={evaluation.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">Evaluación</p>
                      <p className="text-xs text-slate-600">
                        {format(new Date(evaluation.fecha_evaluacion), "dd/MM/yyyy")} • {evaluation.entrenador_nombre}
                      </p>
                    </div>
                    <Badge className="bg-purple-500">
                      {((evaluation.tecnica + evaluation.tactica + evaluation.fisica + evaluation.actitud + evaluation.trabajo_equipo) / 5).toFixed(1)}/5
                    </Badge>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{evaluation.tecnica}</p>
                      <p className="text-xs text-slate-600">Técnica</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{evaluation.tactica}</p>
                      <p className="text-xs text-slate-600">Táctica</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{evaluation.fisica}</p>
                      <p className="text-xs text-slate-600">Física</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{evaluation.actitud}</p>
                      <p className="text-xs text-slate-600">Actitud</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{evaluation.trabajo_equipo}</p>
                      <p className="text-xs text-slate-600">Equipo</p>
                    </div>
                  </div>
                  {evaluation.observaciones && (
                    <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                      {evaluation.observaciones}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-3">
          {messages.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay mensajes del grupo</p>
              </CardContent>
            </Card>
          ) : (
            messages.slice(0, 20).map(msg => (
              <Card key={msg.id} className="border-none shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{msg.remitente_nombre}</p>
                        {msg.prioridad !== "Normal" && (
                          <Badge className={msg.prioridad === "Urgente" ? "bg-red-500" : "bg-orange-500"}>
                            {msg.prioridad}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{msg.mensaje}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(msg.created_date), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {(isAdmin || isCoach) && (
          <TabsContent value="attendance" className="mt-4 space-y-3">
            <Card className="border-none shadow-lg bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 mb-3">Resumen de Asistencia</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.presente}</p>
                    <p className="text-xs text-slate-600">Presente</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{attendanceStats.justificado}</p>
                    <p className="text-xs text-slate-600">Justificado</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.ausente}</p>
                    <p className="text-xs text-slate-600">Ausente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {attendance.map(att => {
              const playerAtt = att.asistencias?.find(a => a.jugador_id === playerId);
              if (!playerAtt) return null;
              return (
                <Card key={att.id} className="border-none shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          {format(new Date(att.fecha), "dd/MM/yyyy")}
                        </p>
                        <p className="text-sm text-slate-600">{att.categoria}</p>
                      </div>
                      <Badge className={
                        playerAtt.estado === "presente" ? "bg-green-500" :
                        playerAtt.estado === "justificado" ? "bg-yellow-500" :
                        "bg-red-500"
                      }>
                        {playerAtt.estado}
                      </Badge>
                    </div>
                    {playerAtt.observaciones && (
                      <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-2 rounded">
                        {playerAtt.observaciones}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}

        {(isAdmin || isCoach) && (
          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Nota
              </Button>
            </div>

            {showNoteForm && (
              <MemberNoteForm 
                onSubmit={handleAddNote}
                onCancel={() => setShowNoteForm(false)}
                isSubmitting={createNoteMutation.isPending}
              />
            )}

            {notes.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay notas internas</p>
                </CardContent>
              </Card>
            ) : (
              notes.map(note => (
                <MemberNoteCard key={note.id} note={note} />
              ))
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}