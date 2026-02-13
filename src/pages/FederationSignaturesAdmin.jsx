import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, ExternalLink, CheckCircle2, Clock, AlertCircle, User, Search, Save, Loader2, Mail, Filter, Send } from "lucide-react";
import { toast } from "sonner";

export default function FederationSignaturesAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editData, setEditData] = useState({});
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsCoach(currentUser.es_entrenador === true);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: allPlayers, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list('-created_date'),
    initialData: [],
  });

  // Filtrar jugadores según rol
  // Si tiene permiso "puede_gestionar_firmas" o es tesorero, ve TODOS los jugadores
  const isTreasurer = user?.es_tesorero === true;
  const players = isAdmin || user?.puede_gestionar_firmas || isTreasurer
    ? allPlayers.filter(p => p.activo)
    : allPlayers.filter(p => p.activo && user?.categorias_entrena?.includes(p.deporte));

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, data, playerData }) => {
      const result = await base44.entities.Player.update(id, data);
      
      // Enviar notificación por email si se añadieron nuevos enlaces
      const newEnlaceJugador = data.enlace_firma_jugador && !playerData.enlace_firma_jugador;
      const newEnlaceTutor = data.enlace_firma_tutor && !playerData.enlace_firma_tutor;
      
      if (newEnlaceJugador || newEnlaceTutor) {
        try {
          const enlacesInfo = [];
          if (newEnlaceJugador) enlacesInfo.push("Firma del Jugador");
          if (newEnlaceTutor) enlacesInfo.push("Firma del Padre/Tutor");
          
          await base44.functions.invoke('sendEmail', {
            to: playerData.email_padre,
            subject: `🖊️ Enlaces de Firma Disponibles - ${playerData.nombre}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">🖊️ Firma disponible en la App</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb;">
                  <p style="font-size: 16px;">Estimado/a padre/madre/tutor,</p>
                  <p>Los <strong>enlaces de firma de federación</strong> para <strong>${playerData.nombre}</strong> ya están <strong>disponibles dentro de la aplicación del club</strong>.</p>
                  
                  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #92400e; margin-top: 0;">📋 Firmas pendientes:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                      ${newEnlaceJugador ? `<li style="margin: 10px 0;"><strong>Firma del Jugador</strong></li>` : ''}
                      ${newEnlaceTutor ? `<li style="margin: 10px 0;"><strong>Firma del Padre/Tutor Legal</strong></li>` : ''}
                    </ul>
                  </div>
                  
                  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>¿Cómo firmar?</strong></p>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                      <li>Abra la <strong>app del club</strong> en su móvil o navegador</li>
                      <li>Vaya al menú <strong>“🖊️ Firmas Federación”</strong></li>
                      <li>Seleccione a <strong>${playerData.nombre}</strong> y pulse <strong>“Firmar”</strong></li>
                    </ol>
                  </div>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://app.cdbustarviejo.com" style="background:#ea580c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">
                      Abrir la app del club →
                    </a>
                  </div>
                </div>
                <div style="background: #1e293b; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                  <p style="margin: 0; font-size: 12px;">CD Bustarviejo</p>
                </div>
              </div>
            `
          });
          toast.success("📧 Notificación enviada al padre/tutor");
        } catch (error) {
          console.error("Error enviando notificación:", error);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setEditingPlayer(null);
      setEditData({});
      toast.success("✅ Enlaces guardados correctamente");
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error("Error al guardar. Intenta de nuevo.");
    },
  });

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const getSignatureStatus = (player) => {
    const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
    const hasEnlaceJugador = !!player.enlace_firma_jugador;
    const hasEnlaceTutor = !!player.enlace_firma_tutor;
    const firmaJugadorOk = player.firma_jugador_completada === true;
    const firmaTutorOk = player.firma_tutor_completada === true;

    if (!hasEnlaceJugador && !hasEnlaceTutor) return "sin_enlaces";
    
    const jugadorPendiente = hasEnlaceJugador && !firmaJugadorOk;
    const tutorPendiente = hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad;
    
    if (jugadorPendiente || tutorPendiente) return "pendiente";
    return "completado";
  };

  const handleStartEdit = (player) => {
    setEditingPlayer(player.id);
    setEditData({
      enlace_firma_jugador: player.enlace_firma_jugador || "",
      enlace_firma_tutor: player.enlace_firma_tutor || "",
      firma_jugador_completada: player.firma_jugador_completada || false,
      firma_tutor_completada: player.firma_tutor_completada || false,
    });
  };

  const handleSave = (player) => {
    updatePlayerMutation.mutate({
      id: player.id,
      data: editData,
      playerData: player
    });
  };

  const handleCancel = () => {
    setEditingPlayer(null);
    setEditData({});
  };

  // Obtener categorías únicas
  const categories = [...new Set(players.map(p => p.deporte).filter(Boolean))].sort();

  // Filtrar jugadores
  const filteredPlayers = players.filter(player => {
    const matchesSearch = searchTerm === "" ||
      player.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email_padre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || player.deporte === categoryFilter;
    
    const status = getSignatureStatus(player);
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "sin_enlaces" && status === "sin_enlaces") ||
      (statusFilter === "pendiente" && status === "pendiente") ||
      (statusFilter === "completado" && status === "completado");
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Contadores
  const sinEnlacesCount = players.filter(p => getSignatureStatus(p) === "sin_enlaces").length;
  const pendienteCount = players.filter(p => getSignatureStatus(p) === "pendiente").length;
  const completadoCount = players.filter(p => getSignatureStatus(p) === "completado").length;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <FileSignature className="w-8 h-8 text-orange-600" />
          Gestión de Firmas Federación
        </h1>
        <p className="text-slate-600 mt-1">
          {isAdmin ? "Añade los enlaces de firma para cada jugador" : "Gestiona las firmas de tus equipos"}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-600">{sinEnlacesCount}</p>
            <p className="text-sm text-slate-500">Sin enlaces</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{pendienteCount}</p>
            <p className="text-sm text-yellow-700">Pendientes de firma</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{completadoCount}</p>
            <p className="text-sm text-green-700">Completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-white shadow-sm">
              <TabsTrigger value="all">Todos ({players.length})</TabsTrigger>
              <TabsTrigger value="sin_enlaces">Sin enlaces ({sinEnlacesCount})</TabsTrigger>
              <TabsTrigger value="pendiente" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700">
                Pendientes ({pendienteCount})
              </TabsTrigger>
              <TabsTrigger value="completado" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                Completados ({completadoCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lista de jugadores */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <FileSignature className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay jugadores</h3>
          <p className="text-slate-500">Ajusta los filtros para ver más resultados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlayers.map(player => {
            const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
            const status = getSignatureStatus(player);
            const isEditing = editingPlayer === player.id;

            return (
              <Card key={player.id} className={`border-2 transition-colors ${
                status === "completado" ? "border-green-200 bg-green-50/30" :
                status === "pendiente" ? "border-yellow-200 bg-yellow-50/30" :
                "border-slate-200"
              }`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Info del jugador */}
                    <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
                      {player.foto_url ? (
                        <img src={player.foto_url} alt={player.nombre} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-orange-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                       <p className="font-semibold text-slate-900 truncate">{player.nombre}</p>
                       <p className="text-xs text-slate-500 truncate">{player.deporte}</p>
                       <p className="text-xs text-slate-400 truncate">{player.email_padre}</p>
                       {status === "pendiente" && player.updated_date && (
                         <p className="text-[10px] text-orange-600 font-medium mt-0.5">
                           ⏳ {Math.floor((new Date() - new Date(player.updated_date)) / (1000 * 60 * 60 * 24))} días pendiente
                         </p>
                       )}
                      </div>
                    </div>

                    {/* Campos de enlaces */}
                    <div className="flex-1 space-y-3">
                      {/* Firma Jugador */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-sm font-medium text-slate-700 sm:w-32 flex-shrink-0">
                          Firma Jugador:
                        </label>
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editData.enlace_firma_jugador || ""}
                              onChange={(e) => setEditData({...editData, enlace_firma_jugador: e.target.value})}
                              placeholder="https://federacion.es/firma/..."
                              className="flex-1"
                            />
                            {editData.enlace_firma_jugador && (
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editData.firma_jugador_completada}
                                  onChange={(e) => setEditData({...editData, firma_jugador_completada: e.target.checked})}
                                  className="rounded"
                                />
                                Firmado
                              </label>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-2">
                            {player.enlace_firma_jugador ? (
                              <>
                                <a href={player.enlace_firma_jugador} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs">
                                  {player.enlace_firma_jugador.substring(0, 40)}...
                                </a>
                                {player.firma_jugador_completada ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Firmado</Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400 text-sm">Sin enlace</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Firma Tutor (solo menores) */}
                      {!esMayorDeEdad && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <label className="text-sm font-medium text-slate-700 sm:w-32 flex-shrink-0">
                            Firma Tutor:
                          </label>
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={editData.enlace_firma_tutor || ""}
                                onChange={(e) => setEditData({...editData, enlace_firma_tutor: e.target.value})}
                                placeholder="https://federacion.es/firma-tutor/..."
                                className="flex-1"
                              />
                              {editData.enlace_firma_tutor && (
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editData.firma_tutor_completada}
                                    onChange={(e) => setEditData({...editData, firma_tutor_completada: e.target.checked})}
                                    className="rounded"
                                  />
                                  Firmado
                                </label>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-2">
                              {player.enlace_firma_tutor ? (
                                <>
                                  <a href={player.enlace_firma_tutor} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs">
                                    {player.enlace_firma_tutor.substring(0, 40)}...
                                  </a>
                                  {player.firma_tutor_completada ? (
                                    <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Firmado</Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm">Sin enlace</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 lg:flex-shrink-0">
                      {isEditing ? (
                        <>
                          <Button
                            onClick={() => handleSave(player)}
                            disabled={updatePlayerMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            {updatePlayerMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><Save className="w-4 h-4 mr-1" /> Guardar</>
                            )}
                          </Button>
                          <Button
                            onClick={handleCancel}
                            variant="outline"
                            size="sm"
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Button
                            onClick={() => handleStartEdit(player)}
                            variant="outline"
                            size="sm"
                          >
                            {status === "sin_enlaces" ? "Añadir enlaces" : "Editar"}
                          </Button>
                          {status === "pendiente" && player.email_padre && (
                            <Button
                              onClick={async () => {
                                try {
                                  const pendientes = [];
                                  if (player.enlace_firma_jugador && !player.firma_jugador_completada) pendientes.push("Firma del Jugador");
                                  if (player.enlace_firma_tutor && !player.firma_tutor_completada && !(calcularEdad(player.fecha_nacimiento) >= 18)) pendientes.push("Firma del Tutor");
                                  await base44.functions.invoke('sendEmail', {
                                    to: player.email_padre,
                                    subject: `⏰ Recordatorio: Firmas pendientes - ${player.nombre}`,
                                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                                      <div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:20px;text-align:center;border-radius:10px 10px 0 0;">
                                        <h1 style="color:white;margin:0;">🖊️ Firmas Pendientes</h1>
                                      </div>
                                      <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;">
                                        <p>Hola,</p>
                                        <p>Te recordamos que <strong>${player.nombre}</strong> tiene firmas de federación <strong>pendientes</strong>:</p>
                                        <ul>${pendientes.map(p => `<li><strong>${p}</strong></li>`).join('')}</ul>
                                        <p>Por favor, accede a la app y completa las firmas lo antes posible.</p>
                                        <div style="text-align:center;margin:24px 0;">
                                          <a href="https://app.cdbustarviejo.com" style="background:#ea580c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Abrir la app →</a>
                                        </div>
                                      </div>
                                    </div>`
                                  });
                                  toast.success(`📧 Recordatorio enviado a ${player.email_padre}`);
                                } catch (e) {
                                  toast.error("Error al enviar recordatorio");
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs"
                            >
                              <Send className="w-3 h-3 mr-1" /> Recordar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}