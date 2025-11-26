import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

import PlayerCard from "../components/players/PlayerCard";
import PlayerForm from "../components/players/PlayerForm";
import ContactCard from "../components/ContactCard";
import AchievementsBadges from "../components/dashboard/AchievementsBadges";
import PlayerCardSkeleton from "../components/skeletons/PlayerCardSkeleton";
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";

export default function ParentPlayers() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players, isLoading } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: allPlayers } = useQuery({
    queryKey: ['allPlayersForRenewal'],
    queryFn: async () => {
      return await base44.entities.Player.list();
    },
    initialData: [],
  });

  const { data: schedules } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-fecha_evaluacion'),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      const dataWithParentEmail = {
        ...playerData,
        email_padre: user?.email || playerData.email_padre
      };
      const newPlayer = await base44.entities.Player.create(dataWithParentEmail);
      
      // Recalcular descuentos de TODOS los hermanos de la familia
      try {
        const familyPlayers = allPlayers.filter(p => 
          (p.email_padre === user?.email || p.email_padre === dataWithParentEmail.email_padre) &&
          p.activo &&
          p.id !== newPlayer.id
        );
        
        if (familyPlayers.length > 0) {
          // Incluir el nuevo jugador en el cálculo
          const allFamilyBirthDates = [
            ...familyPlayers.map(p => ({ id: p.id, nombre: p.nombre, fecha: p.fecha_nacimiento })),
            { id: newPlayer.id, nombre: newPlayer.nombre, fecha: newPlayer.fecha_nacimiento }
          ].filter(p => p.fecha);
          
          // Ordenar por fecha (el mayor primero - fecha más antigua)
          allFamilyBirthDates.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          
          // El mayor (primera posición) no tiene descuento, los demás sí
          const oldestPlayerId = allFamilyBirthDates[0]?.id;
          
          // Obtener todos los pagos pendientes de la familia
          const allPayments = await base44.entities.Payment.list();
          
          // Actualizar descuentos de todos los hermanos existentes
          for (const sibling of familyPlayers) {
            const shouldHaveDiscount = sibling.id !== oldestPlayerId;
            const currentHasDiscount = sibling.tiene_descuento_hermano === true;
            
            if (shouldHaveDiscount !== currentHasDiscount) {
              // Actualizar el jugador
              await base44.entities.Player.update(sibling.id, {
                tiene_descuento_hermano: shouldHaveDiscount,
                descuento_aplicado: shouldHaveDiscount ? 25 : 0
              });
              console.log(`📋 Descuento actualizado para ${sibling.nombre}: ${shouldHaveDiscount ? '25€' : 'sin descuento'}`);
              
              // Buscar dónde aplicar el descuento de 25€
              if (shouldHaveDiscount && !currentHasDiscount) {
                // El hermano ahora tiene derecho a descuento - buscar dónde aplicarlo
                
                // Primero intentar en Junio si está pendiente
                const junioPendiente = allPayments.find(p => 
                  p.jugador_id === sibling.id && 
                  p.estado === "Pendiente" &&
                  p.mes === "Junio"
                );
                
                if (junioPendiente) {
                  // Aplicar descuento en Junio
                  const newAmount = (junioPendiente.cantidad || 0) - 25;
                  if (newAmount > 0) {
                    await base44.entities.Payment.update(junioPendiente.id, {
                      cantidad: newAmount,
                      notas: `${junioPendiente.notas || ''} [Descuento hermano 25€ aplicado]`.trim()
                    });
                    console.log(`💰 Descuento aplicado en Junio de ${sibling.nombre}: -25€`);
                  }
                } else {
                  // Junio ya está pagado/en revisión - aplicar en siguiente cuota pendiente
                  const siguienteCuotaPendiente = allPayments.find(p => 
                    p.jugador_id === sibling.id && 
                    p.estado === "Pendiente" &&
                    (p.mes === "Septiembre" || p.mes === "Diciembre")
                  );
                  
                  if (siguienteCuotaPendiente) {
                    const newAmount = (siguienteCuotaPendiente.cantidad || 0) - 25;
                    if (newAmount > 0) {
                      await base44.entities.Payment.update(siguienteCuotaPendiente.id, {
                        cantidad: newAmount,
                        notas: `${siguienteCuotaPendiente.notas || ''} [Descuento hermano 25€ aplicado - trasladado de inscripción]`.trim()
                      });
                      console.log(`💰 Descuento trasladado a ${siguienteCuotaPendiente.mes} de ${sibling.nombre}: -25€`);
                    }
                  } else {
                    // No hay cuotas pendientes - guardar nota en el jugador para aplicar manualmente
                    console.log(`⚠️ ${sibling.nombre} tiene derecho a 25€ de descuento pero no hay cuotas pendientes`);
                  }
                }
              }
            }
          }
          
          // Actualizar el nuevo jugador si corresponde
          const newPlayerShouldHaveDiscount = newPlayer.id !== oldestPlayerId;
          if (newPlayerShouldHaveDiscount !== newPlayer.tiene_descuento_hermano) {
            await base44.entities.Player.update(newPlayer.id, {
              tiene_descuento_hermano: newPlayerShouldHaveDiscount,
              descuento_aplicado: newPlayerShouldHaveDiscount ? 25 : 0
            });
          }
        }
      } catch (error) {
        console.error("Error recalculando descuentos familiares:", error);
      }
      
      try {
        console.log('📧 [ParentPlayers] Enviando notificación de inscripción a admin');
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo - Sistema de Inscripciones",
          to: "cdbustarviejo@gmail.com",
          subject: `Nueva Inscripción de Jugador - ${playerData.nombre}`,
          body: `
            <h2>Nueva Inscripción Recibida</h2>
            <p><strong>Tipo:</strong> ${playerData.tipo_inscripcion}</p>
            <p><strong>Jugador:</strong> ${playerData.nombre}</p>
            <p><strong>Deporte/Categoría:</strong> ${playerData.deporte}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${new Date(playerData.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
            <hr>
            <h3>Datos de Contacto:</h3>
            <p><strong>Email Padre/Tutor 1:</strong> ${playerData.email_padre}</p>
            <p><strong>Teléfono:</strong> ${playerData.telefono}</p>
            ${playerData.email_tutor_2 ? `<p><strong>Email Padre/Tutor 2:</strong> ${playerData.email_tutor_2}</p>` : ''}
            ${playerData.telefono_tutor_2 ? `<p><strong>Teléfono Tutor 2:</strong> ${playerData.telefono_tutor_2}</p>` : ''}
            ${playerData.email_jugador ? `<p><strong>Email Jugador:</strong> ${playerData.email_jugador} (Acceso autorizado)</p>` : ''}
            <p><strong>Dirección:</strong> ${playerData.direccion}</p>
            <hr>
            <h3>Autorizaciones:</h3>
            <p><strong>Política de Privacidad:</strong> ${playerData.acepta_politica_privacidad ? 'Aceptada ✅' : 'No aceptada'}</p>
            <p><strong>Fotografías/Videos:</strong> ${playerData.autorizacion_fotografia}</p>
            <p><strong>Acceso del Jugador a la App:</strong> ${playerData.acceso_jugador_autorizado ? 'Autorizado ✅' : 'No autorizado'}</p>
            ${playerData.observaciones ? `<hr><h3>Observaciones:</h3><p>${playerData.observaciones}</p>` : ''}
            <hr>
            <p style="font-size: 12px; color: #666;">Inscripción registrada el ${new Date().toLocaleString('es-ES')}</p>
          `
        });
        // Send confirmation to parents
        try {
          console.log('📧 [ParentPlayers] Enviando confirmación de inscripción a padres:', { padre: playerData.email_padre, tutor2: playerData.email_tutor_2 });
          
          const emailBody = `Estimados padres/tutores,

Confirmamos que hemos recibido correctamente la inscripcion de ${playerData.nombre}.

DATOS DE LA INSCRIPCION
Tipo: ${playerData.tipo_inscripcion}
Jugador: ${playerData.nombre}
Deporte/Categoria: ${playerData.deporte}
Fecha de Nacimiento: ${new Date(playerData.fecha_nacimiento).toLocaleDateString('es-ES')}

En breve procesaremos la informacion y podran acceder a todos los servicios del club a traves de la aplicacion.

Atentamente,

CD Bustarviejo
Equipo de Administracion

Datos de contacto:
Email: cdbustarviejo@gmail.com
          `;
          
          console.log('📤 [ParentPlayers] Enviando a padre:', playerData.email_padre);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: playerData.email_padre,
            subject: "Inscripción Recibida - CD Bustarviejo",
            body: emailBody
          });
          console.log('✅ [ParentPlayers] Email enviado a padre');
          
          if (playerData.email_tutor_2) {
            console.log('📤 [ParentPlayers] Enviando a tutor 2:', playerData.email_tutor_2);
            await base44.integrations.Core.SendEmail({
              from_name: "CD Bustarviejo",
              to: playerData.email_tutor_2,
              subject: "Inscripción Recibida - CD Bustarviejo",
              body: emailBody
            });
            console.log('✅ [ParentPlayers] Email enviado a tutor 2');
          }
        } catch (error) {
          console.error("Error sending confirmation emails:", error);
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
      
      return newPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['allPlayersForRenewal'] });
      setShowForm(false);
      setEditingPlayer(null);
      setSuccessMessage("¡Jugador registrado!");
      setShowSuccess(true);
      setTimeout(() => toast.success("Jugador registrado correctamente"), 2000);
    },
    onError: (error) => {
      console.error("Error creating player:", error);
      toast.error("Error al registrar el jugador");
    }
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, playerData }) => {
      const safeData = {
        ...playerData,
        email_padre: editingPlayer?.email_padre || user?.email,
      };
      return base44.entities.Player.update(id, safeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
      setSuccessMessage("¡Datos actualizados!");
      setShowSuccess(true);
      setTimeout(() => toast.success("Jugador actualizado correctamente"), 2000);
    },
    onError: (error) => {
      console.error("Error updating player:", error);
      toast.error("Error al actualizar el jugador");
    }
  });

  const handleSubmit = async (playerData) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, playerData });
    } else {
      createPlayerMutation.mutate(playerData);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const futbolPlayers = players.filter(p => 
    p.deporte?.includes("Fútbol") && !p.deporte?.includes("Femenino")
  );
  const futbolFemeninoPlayers = players.filter(p => p.deporte === "Fútbol Femenino");
  const baloncestoPlayers = players.filter(p => p.deporte?.includes("Baloncesto"));

  return (
    <>
      <CheckmarkAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={successMessage}
      />
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 lg:gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Mis Jugadores</h1>
          <p className="text-slate-600 mt-1 text-sm lg:text-base">Gestiona la información de tus jugadores</p>
        </div>
        <Button
          onClick={() => {
            setEditingPlayer(null);
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg w-full md:w-auto"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
          <span className="text-sm lg:text-base">Registrar Jugador</span>
        </Button>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-6 text-xs lg:text-sm">
          <strong>Protección de datos:</strong> Puedes editar la información de contacto y detalles de tus jugadores. 
          Los campos críticos como <strong>deporte y categoría</strong> solo pueden ser modificados por el administrador.
          <br />
          <span className="text-[10px] lg:text-xs text-blue-600 mt-1 block">
            ⚠️ No es posible eliminar jugadores. Si necesitas dar de baja a un jugador, contacta con el administrador.
          </span>
        </AlertDescription>
      </Alert>

      <Alert className="bg-green-50 border-green-200">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 ml-6 text-xs lg:text-sm">
          <strong>💡 Consejo para familias con varios hijos:</strong> Si vas a inscribir a varios hermanos, 
          te recomendamos <strong>inscribir primero al hermano MAYOR</strong> y después a los menores. 
          De esta forma, el descuento de 25€ por hermano se aplicará automáticamente en la cuota de inscripción de los hermanos menores.
          <br />
          <span className="text-[10px] lg:text-xs text-green-600 mt-1 block">
            ℹ️ Si ya inscribiste primero a un hermano menor, no te preocupes: el sistema recalculará los descuentos automáticamente cuando inscribas a los demás.
          </span>
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-3 lg:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-sm text-slate-600 mb-1">Total Jugadores</p>
              <p className="text-xl lg:text-3xl font-bold text-slate-900">{players.length}</p>
            </div>
            <span className="text-2xl lg:text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 lg:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-sm text-slate-600 mb-1">Fútbol</p>
              <p className="text-xl lg:text-3xl font-bold text-blue-700">
                {futbolPlayers.length + futbolFemeninoPlayers.length}
              </p>
            </div>
            <span className="text-2xl lg:text-4xl">⚽</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 lg:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-sm text-slate-600 mb-1">Baloncesto</p>
              <p className="text-xl lg:text-3xl font-bold text-orange-700">{baloncestoPlayers.length}</p>
            </div>
            <span className="text-2xl lg:text-4xl">🏀</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <PlayerForm
            player={editingPlayer}
            allPlayers={allPlayers}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPlayer(null);
            }}
            isSubmitting={createPlayerMutation.isPending || updatePlayerMutation.isPending}
            isParent={true}
            parentEmail={user?.email}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="text-4xl lg:text-6xl mb-4">⚽🏀</div>
          <p className="text-slate-500 text-base lg:text-lg mb-2">No tienes jugadores registrados</p>
          <p className="text-slate-400 text-xs lg:text-sm">Haz clic en "Registrar Jugador" para añadir a tu hijo/a</p>
        </div>
      ) : (
        <>
          {/* Jugadores de Fútbol */}
          {futbolPlayers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚽</span> Fútbol
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {futbolPlayers.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Jugadores de Fútbol Femenino */}
          {futbolFemeninoPlayers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚽</span> Fútbol Femenino
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {futbolFemeninoPlayers.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Jugadores de Baloncesto */}
          {baloncestoPlayers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>🏀</span> Baloncesto
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {baloncestoPlayers.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}

      <ContactCard />
    </div>
  </>
  );
}