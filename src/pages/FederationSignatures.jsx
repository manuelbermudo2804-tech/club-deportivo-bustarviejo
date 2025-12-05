import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileSignature, ExternalLink, CheckCircle2, Clock, AlertCircle, User, HelpCircle, ChevronRight, MousePointer, Edit3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePageTutorial } from "../components/tutorials/useTutorial";

export default function FederationSignatures() {
  // Tutorial interactivo para primera visita
  usePageTutorial("parent_signatures");
  
  const [user, setUser] = useState(null);
  const [visitedLinks, setVisitedLinks] = useState({});
  const [showTutorial, setShowTutorial] = useState(false);
  const queryClient = useQueryClient();

  // Cargar enlaces visitados desde localStorage al inicio
  useEffect(() => {
    const saved = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('firma_')) {
        saved[key] = true;
      }
    }
    setVisitedLinks(saved);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: allPlayers, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Filtrar jugadores del usuario actual
  const myPlayers = allPlayers.filter(p => 
    p.email_padre === user?.email || p.email_tutor_2 === user?.email
  );

  // Jugadores con enlaces de firma pendientes
  const playersWithPendingSignatures = myPlayers.filter(p => {
    const hasEnlaceJugador = !!p.enlace_firma_jugador;
    const hasEnlaceTutor = !!p.enlace_firma_tutor;
    const firmaJugadorOk = p.firma_jugador_completada === true;
    const firmaTutorOk = p.firma_tutor_completada === true;
    
    // Calcular si es mayor de edad
    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return null;
      const hoy = new Date();
      const nacimiento = new Date(fechaNac);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    };
    const esMayorDeEdad = calcularEdad(p.fecha_nacimiento) >= 18;
    
    // Tiene pendientes si hay enlaces y no están firmados
    if (hasEnlaceJugador && !firmaJugadorOk) return true;
    if (hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad) return true;
    return false;
  });

  // Jugadores con firmas completadas
  const playersWithCompletedSignatures = myPlayers.filter(p => {
    const hasEnlaceJugador = !!p.enlace_firma_jugador;
    const hasEnlaceTutor = !!p.enlace_firma_tutor;
    const firmaJugadorOk = p.firma_jugador_completada === true;
    const firmaTutorOk = p.firma_tutor_completada === true;
    
    if (!hasEnlaceJugador && !hasEnlaceTutor) return false;
    
    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return null;
      const hoy = new Date();
      const nacimiento = new Date(fechaNac);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    };
    const esMayorDeEdad = calcularEdad(p.fecha_nacimiento) >= 18;
    
    // Completado si todos los enlaces tienen firma
    const jugadorOk = !hasEnlaceJugador || firmaJugadorOk;
    const tutorOk = !hasEnlaceTutor || firmaTutorOk || esMayorDeEdad;
    
    return jugadorOk && tutorOk;
  });

  // Obtener configuración de temporada
  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const [processingSignature, setProcessingSignature] = useState({});
  
  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, data, playerName, signatureType }) => {
      const result = await base44.entities.Player.update(id, data);
      
      // Notificar al admin si las notificaciones están activas
      if (seasonConfig?.notificaciones_admin_email) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Firmas",
            to: "cdbustarviejo@gmail.com",
            subject: `✍️ Firma Completada - ${playerName}`,
            body: `
              <h2>Firma de Federación Completada</h2>
              <p><strong>Jugador:</strong> ${playerName}</p>
              <p><strong>Tipo de firma:</strong> ${signatureType === "jugador" ? "Firma del Jugador" : "Firma del Tutor"}</p>
              <p><strong>Marcado por:</strong> ${user?.email}</p>
              <hr>
              <p style="font-size: 12px; color: #666;">Completado el ${new Date().toLocaleString('es-ES')}</p>
            `
          });
        } catch (error) {
          console.error("Error sending signature notification:", error);
        }
      }
      
      return { id, signatureType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success("✅ Firma marcada como completada");
      // Limpiar estado de procesamiento
      setProcessingSignature(prev => {
        const newState = { ...prev };
        delete newState[`${data.id}_${data.signatureType}`];
        return newState;
      });
    },
    onError: (error, variables) => {
      console.error("Error:", error);
      toast.error("Error al actualizar. Intenta de nuevo.");
      // Limpiar estado de procesamiento en caso de error
      setProcessingSignature(prev => {
        const newState = { ...prev };
        delete newState[`${variables.id}_${variables.signatureType}`];
        return newState;
      });
    },
  });

  const handleMarkSignatureComplete = (player, type) => {
    const key = `${player.id}_${type}`;
    
    // Evitar doble click
    if (processingSignature[key]) {
      return;
    }
    
    // Marcar como procesando inmediatamente
    setProcessingSignature(prev => ({ ...prev, [key]: true }));
    
    const updateData = type === "jugador" 
      ? { firma_jugador_completada: true }
      : { firma_tutor_completada: true };
    
    updatePlayerMutation.mutate({ 
      id: player.id, 
      data: updateData, 
      playerName: player.nombre,
      signatureType: type 
    });
  };

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const renderPlayerSignatures = (player, showActions = true) => {
    const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
    const hasEnlaceJugador = !!player.enlace_firma_jugador;
    const hasEnlaceTutor = !!player.enlace_firma_tutor;
    const firmaJugadorOk = player.firma_jugador_completada === true;
    const firmaTutorOk = player.firma_tutor_completada === true;

    return (
      <Card key={player.id} className="border-2 border-slate-200 hover:border-orange-300 transition-colors">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
          <div className="flex items-center gap-3">
            {player.foto_url ? (
              <img src={player.foto_url} alt={player.nombre} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <User className="w-6 h-6 text-orange-600" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-lg">{player.nombre}</CardTitle>
              <p className="text-sm text-slate-600">{player.deporte}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Firma del Jugador */}
          {hasEnlaceJugador && (
            <div className={`p-4 rounded-lg border-2 ${firmaJugadorOk ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSignature className={`w-5 h-5 ${firmaJugadorOk ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className="font-semibold">Firma del Jugador</span>
                </div>
                {firmaJugadorOk ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completada
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                  </Badge>
                )}
              </div>
              
              {!firmaJugadorOk && showActions && (
                <div className="space-y-3">
                  <a 
                    href={player.enlace_firma_jugador} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => {
                      const key = `firma_jugador_visited_${player.id}`;
                      localStorage.setItem(key, 'true');
                      setVisitedLinks(prev => ({ ...prev, [key]: true }));
                    }}
                    className="flex items-center justify-center gap-2 w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir enlace para firmar
                  </a>
                  <Button
                    onClick={() => handleMarkSignatureComplete(player, "jugador")}
                    disabled={processingSignature[`${player.id}_jugador`] || !visitedLinks[`firma_jugador_visited_${player.id}`]}
                    className={`w-full ${visitedLinks[`firma_jugador_visited_${player.id}`] ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    title={!visitedLinks[`firma_jugador_visited_${player.id}`] ? 'Primero debes abrir el enlace azul para firmar' : ''}
                  >
                    {processingSignature[`${player.id}_jugador`] ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Ya he firmado - Marcar como completada
                      </>
                    )}
                  </Button>
                  {!visitedLinks[`firma_jugador_visited_${player.id}`] && (
                    <p className="text-xs text-center text-slate-500">
                      ⬆️ Primero pulsa el botón azul para abrir el enlace de firma
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Firma del Tutor (solo si menor de edad) */}
          {hasEnlaceTutor && !esMayorDeEdad && (
            <div className={`p-4 rounded-lg border-2 ${firmaTutorOk ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSignature className={`w-5 h-5 ${firmaTutorOk ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className="font-semibold">Firma del Padre/Tutor</span>
                </div>
                {firmaTutorOk ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completada
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                  </Badge>
                )}
              </div>
              
              {!firmaTutorOk && showActions && (
                <div className="space-y-3">
                  <a 
                    href={player.enlace_firma_tutor} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => {
                      const key = `firma_tutor_visited_${player.id}`;
                      localStorage.setItem(key, 'true');
                      setVisitedLinks(prev => ({ ...prev, [key]: true }));
                    }}
                    className="flex items-center justify-center gap-2 w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir enlace para firmar
                  </a>
                  <Button
                    onClick={() => handleMarkSignatureComplete(player, "tutor")}
                    disabled={updatePlayerMutation.isPending || !visitedLinks[`firma_tutor_visited_${player.id}`]}
                    className={`w-full ${visitedLinks[`firma_tutor_visited_${player.id}`] ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    title={!visitedLinks[`firma_tutor_visited_${player.id}`] ? 'Primero debes abrir el enlace azul para firmar' : ''}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Ya he firmado - Marcar como completada
                  </Button>
                  {!visitedLinks[`firma_tutor_visited_${player.id}`] && (
                    <p className="text-xs text-center text-slate-500">
                      ⬆️ Primero pulsa el botón azul para abrir el enlace de firma
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sin enlaces asignados */}
          {!hasEnlaceJugador && !hasEnlaceTutor && (
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-slate-500 text-sm">
                No hay enlaces de firma asignados para este jugador.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                El club te notificará cuando estén disponibles.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  // Calcular estadísticas de progreso
  const totalSignaturesNeeded = myPlayers.reduce((count, p) => {
    const hasEnlaceJugador = !!p.enlace_firma_jugador;
    const hasEnlaceTutor = !!p.enlace_firma_tutor;
    const esMayorDeEdad = calcularEdad(p.fecha_nacimiento) >= 18;
    let needed = 0;
    if (hasEnlaceJugador) needed++;
    if (hasEnlaceTutor && !esMayorDeEdad) needed++;
    return count + needed;
  }, 0);

  const completedSignatures = myPlayers.reduce((count, p) => {
    const hasEnlaceJugador = !!p.enlace_firma_jugador;
    const hasEnlaceTutor = !!p.enlace_firma_tutor;
    const firmaJugadorOk = p.firma_jugador_completada === true;
    const firmaTutorOk = p.firma_tutor_completada === true;
    const esMayorDeEdad = calcularEdad(p.fecha_nacimiento) >= 18;
    let completed = 0;
    if (hasEnlaceJugador && firmaJugadorOk) completed++;
    if (hasEnlaceTutor && !esMayorDeEdad && firmaTutorOk) completed++;
    return count + completed;
  }, 0);

  const progressPercent = totalSignaturesNeeded > 0 ? Math.round((completedSignatures / totalSignaturesNeeded) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-8 h-8 text-orange-600" />
            Firmas de Federación
          </h1>
          <p className="text-slate-600 mt-1">Gestiona las firmas digitales de tus jugadores</p>
        </div>
        <Button variant="outline" onClick={() => setShowTutorial(true)} className="gap-2">
          <HelpCircle className="w-4 h-4" />
          ¿Cómo firmar?
        </Button>
      </div>

      {/* Barra de progreso global */}
      {totalSignaturesNeeded > 0 && (
        <Card className={`border-2 ${progressPercent === 100 ? 'border-green-300 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700">Progreso de Firmas</span>
              <span className={`font-bold text-lg ${progressPercent === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                {completedSignatures} / {totalSignaturesNeeded} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {progressPercent === 100 ? (
              <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                ¡Todas las firmas completadas! 🎉
              </p>
            ) : (
              <p className="text-sm text-orange-700 mt-2">
                Quedan {totalSignaturesNeeded - completedSignatures} firma{totalSignaturesNeeded - completedSignatures !== 1 ? 's' : ''} pendiente{totalSignaturesNeeded - completedSignatures !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerta de pendientes */}
      {playersWithPendingSignatures.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-yellow-900 mb-2">
                ⚠️ Firmas Pendientes
              </h3>
              <p className="text-yellow-800">
                Tienes <strong>{playersWithPendingSignatures.length}</strong> jugador{playersWithPendingSignatures.length !== 1 ? 'es' : ''} con firmas de federación pendientes.
              </p>
              <p className="text-yellow-700 text-sm mt-2">
                1. Pulsa en "Abrir enlace para firmar" para ir a la web de la federación<br/>
                2. Completa la firma siguiendo las instrucciones<br/>
                3. Vuelve aquí y pulsa "Ya he firmado" para confirmar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Pendientes */}
      {playersWithPendingSignatures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Firmas Pendientes ({playersWithPendingSignatures.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playersWithPendingSignatures.map(player => renderPlayerSignatures(player, true))}
          </div>
        </div>
      )}

      {/* Sección de Completadas */}
      {playersWithCompletedSignatures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Firmas Completadas ({playersWithCompletedSignatures.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playersWithCompletedSignatures.map(player => renderPlayerSignatures(player, false))}
          </div>
        </div>
      )}

      {/* Sin jugadores con enlaces */}
      {myPlayers.length > 0 && playersWithPendingSignatures.length === 0 && playersWithCompletedSignatures.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <FileSignature className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin enlaces de firma asignados</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Aún no se han asignado enlaces de firma de federación a tus jugadores. 
            Recibirás una notificación por email cuando estén disponibles.
          </p>
        </div>
      )}

      {/* Sin jugadores */}
      {myPlayers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No tienes jugadores registrados</h3>
          <p className="text-slate-500">
            Cuando registres jugadores, aquí podrás gestionar sus firmas de federación.
          </p>
        </div>
      )}

      {/* Tutorial Visual Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-6 h-6 text-orange-600" />
              Cómo Firmar en la Federación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Paso 1 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-1">Pulsa el botón azul "Abrir enlace para firmar"</h4>
                <p className="text-sm text-slate-600 mb-2">Se abrirá la web de la Federación de Fútbol de Madrid en una nueva pestaña.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-800">Haz clic en el botón azul</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Abrir enlace</div>
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-1">Completa la firma en la web de la Federación</h4>
                <p className="text-sm text-slate-600 mb-2">Sigue las instrucciones de la web. Normalmente tendrás que:</p>
                <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
                  <li>Introducir tu DNI o datos personales</li>
                  <li>Dibujar tu firma con el dedo o ratón</li>
                  <li>Confirmar y enviar</li>
                </ul>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-orange-800">Dibuja tu firma en el recuadro que aparece</span>
                </div>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-1">Vuelve aquí y marca como completada</h4>
                <p className="text-sm text-slate-600 mb-2">Una vez hayas firmado en la Federación, vuelve a esta página y pulsa el botón verde.</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">Pulsa "Ya he firmado - Marcar como completada"</span>
                </div>
              </div>
            </div>

            {/* Nota importante */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-900">⚠️ Importante</h4>
                  <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                    <li>• <strong>Firma del Jugador:</strong> La hace el propio jugador (o el padre si es muy pequeño)</li>
                    <li>• <strong>Firma del Tutor:</strong> La hace el padre/madre/tutor legal (solo si es menor de 18)</li>
                    <li>• Si tienes problemas, contacta con el club: <strong>cdbustarviejo@gmail.com</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowTutorial(false)} className="bg-orange-600 hover:bg-orange-700">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}