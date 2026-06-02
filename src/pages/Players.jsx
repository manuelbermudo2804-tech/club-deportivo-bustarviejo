import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, X, Download, AlertTriangle, CheckCircle2, UserX, MessageCircle, Contact } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import PlayerCard from "../components/players/PlayerCard";
import PlayerForm from "../components/players/PlayerForm";
import PlayerProfileDialog from "../components/players/PlayerProfileDialog";
import PlayerCardSkeleton from "../components/skeletons/PlayerCardSkeleton";
import RecalcCuotasDialog from "../components/players/RecalcCuotasDialog";
import { analyzePaymentChanges } from "../components/players/recalcPaymentsHelper";
import RenewalStatsPanel from "../components/players/RenewalStatsPanel";
import CustomPaymentPlanForm from "../components/payments/CustomPaymentPlanForm";

export default function Players() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusRenewalFilter, setStatusRenewalFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterRevisionCategoria, setFilterRevisionCategoria] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showCustomPlanForm, setShowCustomPlanForm] = useState(false);
  const [selectedPlayerForPlan, setSelectedPlayerForPlan] = useState(null);
  const [recalcPlan, setRecalcPlan] = useState(null);
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);
  const [recalcPlayerName, setRecalcPlayerName] = useState("");
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === "admin");
      setIsCoach(currentUser.es_entrenador === true && currentUser.role !== "admin");
    };
    fetchUser();
  }, []);

  // Detectar parámetros de Alta Asistida y abrir formulario pre-rellenado
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('assisted') === 'true') {
      const preData = {};
      if (params.get('email')) preData.email_padre = params.get('email');
      if (params.get('telefono')) preData.telefono = params.get('telefono');
      if (params.get('nombre_jugador')) preData.nombre = params.get('nombre_jugador');
      if (params.get('nombre_contacto')) preData.nombre_tutor_legal = params.get('nombre_contacto');
      preData._assisted_id = params.get('assisted_id') || '';
      setEditingPlayer(preData);
      setShowForm(true);
      // Limpiar URL para evitar reabrir el formulario al navegar
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // El tesorero también debe ver todos los jugadores
  const isTreasurer = user?.es_tesorero === true;

  const { data: allPlayers, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list('-created_date'),
    initialData: [],
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Contar jugadores que requieren revisión de categoría
  const playersNeedingReview = allPlayers.filter(p => p.categoria_requiere_revision && p.activo).length;

  const { data: schedules } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const all = await base44.entities.Payment.list('-created_date', 500);
      return all.filter(p => !p.is_deleted);
    },
    initialData: [],
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: customPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-fecha_evaluacion', 200),
    initialData: [],
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list('-fecha', 200),
    initialData: [],
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Obtener temporada activa
  const { data: activeSeason } = useQuery({
    queryKey: ['activeSeasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const createCustomPlanMutation = useMutation({
    mutationFn: async (planData) => {
      const currentUser = await base44.auth.me();
      return base44.entities.CustomPaymentPlan.create({
        ...planData,
        aprobado_por: currentUser.email,
        aprobado_por_nombre: currentUser.full_name,
        fecha_aprobacion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      setShowCustomPlanForm(false);
      setSelectedPlayerForPlan(null);
      toast.success("Plan personalizado creado correctamente");
    },
  });

  // Filter players based on role
  // Admin y Tesorero ven: activos + pendientes renovación + no_renueva (para gestión completa)
  const players = (isAdmin || isTreasurer)
    ? allPlayers
    : allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
      );

  const createPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      const newPlayer = await base44.entities.Player.create(playerData);
      
      // Enviar email de notificación al club
      try {
        // Email al admin
        await base44.functions.invoke('sendEmail', {
          to: "cdbustarviejo@gmail.com",
          subject: `Nueva Inscripción de Jugador - ${playerData.nombre}`,
          html: `
            <h2>Nueva Inscripción Recibida</h2>
            <p><strong>Tipo:</strong> ${playerData.tipo_inscripcion}</p>
            <p><strong>Jugador:</strong> ${playerData.nombre}</p>
            <p><strong>Categoría:</strong> ${playerData.deporte}</p>
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
        
        // Email de confirmación a los padres
        const emailPadres = [playerData.email_padre];
        if (playerData.email_tutor_2) emailPadres.push(playerData.email_tutor_2);
        
        for (const emailPadre of emailPadres) {
          await base44.functions.invoke('sendEmail', {
            to: emailPadre,
            subject: "Inscripción Recibida - CD Bustarviejo",
            html: `
              <h2>Inscripción Recibida - CD Bustarviejo</h2>
              <p>Estimados padres/tutores,</p>
              <p>Confirmamos que hemos recibido correctamente la inscripción de <strong>${playerData.nombre}</strong>.</p>
              <hr>
              <h3>DATOS DE LA INSCRIPCIÓN</h3>
              <p><strong>Tipo:</strong> ${playerData.tipo_inscripcion}</p>
              <p><strong>Jugador:</strong> ${playerData.nombre}</p>
              <p><strong>Deporte/Categoría:</strong> ${playerData.deporte}</p>
              <p><strong>Fecha de Nacimiento:</strong> ${new Date(playerData.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
              <hr>
              <p>En breve procesaremos la información y podrán acceder a todos los servicios del club a través de la aplicación.</p>
              <br>
              <p>Atentamente,</p>
              <p><strong>CD Bustarviejo</strong><br>Equipo de Administración</p>
              <hr>
              <p style="font-size: 12px; color: #666;">Datos de contacto:<br>Email: cdbustarviejo@gmail.com</p>
            `
          });
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
      
      return newPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, playerData, originalPlayer }) => {
      const updatedPlayer = await base44.entities.Player.update(id, playerData);
      
      // Detectar si se añadieron NUEVOS enlaces de firma (no existían antes O cambiaron)
      const newEnlaceJugador = playerData.enlace_firma_jugador && 
        playerData.enlace_firma_jugador !== originalPlayer?.enlace_firma_jugador;
      const newEnlaceTutor = playerData.enlace_firma_tutor && 
        playerData.enlace_firma_tutor !== originalPlayer?.enlace_firma_tutor;
      
      console.log('🔍 Verificando firmas:', {
        jugadorNuevo: playerData.enlace_firma_jugador,
        jugadorOriginal: originalPlayer?.enlace_firma_jugador,
        tutorNuevo: playerData.enlace_firma_tutor,
        tutorOriginal: originalPlayer?.enlace_firma_tutor,
        enviarEmailJugador: newEnlaceJugador,
        enviarEmailTutor: newEnlaceTutor
      });
      
      if (newEnlaceJugador || newEnlaceTutor) {
        // Enviar notificación al padre/tutor
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
                  <h1 style="color: white; margin: 0;">🖊️ Firma Digital Requerida</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb;">
                  <p style="font-size: 16px;">Estimado/a padre/madre/tutor,</p>
                  <p>Los <strong>enlaces de firma de federación</strong> para <strong>${playerData.nombre}</strong> ya están disponibles.</p>
                  
                  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #92400e; margin-top: 0;">📋 Firmas pendientes:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                      ${newEnlaceJugador ? `<li style="margin: 10px 0;"><strong>Firma del Jugador</strong><br/><a href="${playerData.enlace_firma_jugador}" style="color: #ea580c;">Pulsa aquí para firmar →</a></li>` : ''}
                      ${newEnlaceTutor ? `<li style="margin: 10px 0;"><strong>Firma del Padre/Tutor Legal</strong><br/><a href="${playerData.enlace_firma_tutor}" style="color: #ea580c;">Pulsa aquí para firmar →</a></li>` : ''}
                    </ul>
                  </div>
                  
                  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>¿Cómo firmar?</strong></p>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                      <li>Pulsa en el enlace correspondiente</li>
                      <li>Sigue las instrucciones de la federación</li>
                      <li>Una vez firmado, entra en la app del club y marca "Firma completada"</li>
                    </ol>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280;">También puedes acceder a los enlaces desde la aplicación del club, en la ficha del jugador.</p>
                </div>
                <div style="background: #1e293b; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                  <p style="margin: 0; font-size: 12px;">CD Bustarviejo - Temporada 2024/2025</p>
                </div>
              </div>
            `
          });
          console.log('📧 Notificación de enlaces de firma enviada a:', playerData.email_padre);
        } catch (error) {
          console.error("Error enviando notificación de firma:", error);
        }
      }
      
      return updatedPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId) => {
      const player = allPlayers.find(p => p.id === playerId);
      if (!player) throw new Error("Jugador no encontrado");

      // Archivar a PlayerHistory antes de eliminar
      await base44.entities.PlayerHistory.create({
        jugador_original_id: player.id,
        nombre: player.nombre,
        deporte: player.deporte,
        temporadas_activo: [activeSeason?.temporada].filter(Boolean),
        ultima_temporada: activeSeason?.temporada || "Desconocida",
        motivo_salida: player.estado_renovacion === "no_renueva" ? "no_renueva" : "baja_voluntaria",
        fecha_salida: new Date().toISOString(),
        email_padre: player.email_padre,
        telefono: player.telefono,
        datos_completos: player,
        puede_reactivarse: true,
        notas_admin: `Eliminado por admin el ${new Date().toLocaleDateString('es-ES')}`
      });

      // Eliminar jugador
      await base44.entities.Player.delete(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success("Jugador archivado y eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar jugador: " + error.message);
    }
  });

  const handleSubmit = async (playerData) => {
    // Limpiar campo interno de Alta Asistida antes de guardar
    const assistedId = playerData._assisted_id || editingPlayer?._assisted_id;
    const cleanData = { ...playerData };
    delete cleanData._assisted_id;

    if (editingPlayer?.id) {
      const oldCategory = editingPlayer.deporte;
      const newCategory = cleanData.deporte;
      const categoryChanged = oldCategory && newCategory && oldCategory !== newCategory;

      // Si cambia la categoría: PRIMERO analizar pagos pendientes, luego guardar.
      // Así el diálogo aparece sí o sí, sin depender del cierre del form ni de race conditions.
      if (categoryChanged && isAdmin) {
        try {
          // Asegurar que tenemos la temporada activa (puede no estar cacheada todavía)
          let season = activeSeason;
          if (!season?.temporada) {
            const seasons = await base44.entities.SeasonConfig.list();
            season = seasons.find(c => c.activa === true);
          }

          const plan = await analyzePaymentChanges({
            playerId: editingPlayer.id,
            oldCategory,
            newCategory,
            activeSeason: season,
            descuentoAplicado: cleanData.descuento_aplicado || 0,
          });
          // Mostrar diálogo siempre que haya algo que enseñar (recalculables o congeladas)
          if (plan.canRecalculate || plan.frozen?.length > 0) {
            setRecalcPlan(plan);
            setRecalcPlayerName(cleanData.nombre || editingPlayer.nombre);
            setShowRecalcDialog(true);
          } else {
            toast.info("Categoría cambiada. No había cuotas pendientes que actualizar.");
          }
        } catch (err) {
          console.error("Error analizando cambio de categoría:", err);
          toast.error("No se pudo analizar el cambio de cuotas. La categoría sí se ha guardado.");
        }
      }

      updatePlayerMutation.mutate({ id: editingPlayer.id, playerData: cleanData, originalPlayer: editingPlayer });
    } else {
      createPlayerMutation.mutate(cleanData, {
        onSuccess: async () => {
          // Si viene de Alta Asistida, marcar la solicitud como resuelta
          if (assistedId) {
            try {
              const me = await base44.auth.me();
              await base44.entities.AssistedRegistration.update(assistedId, {
                estado: 'resuelto',
                resuelto_por: me?.email,
                fecha_resolucion: new Date().toISOString(),
                notas_admin: (await base44.entities.AssistedRegistration.filter({ id: assistedId }))?.[0]?.notas_admin 
                  ? undefined 
                  : 'Jugador dado de alta manualmente por admin desde panel de Alta Asistida'
              });
              toast.success('Solicitud de Alta Asistida marcada como resuelta');
            } catch (e) { console.error('Error marking assisted registration:', e); }
          }
        }
      });
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const [initialTab, setInitialTab] = useState("info");

  const handleViewProfile = (player, tab = "info") => {
    setSelectedPlayer(player);
    setInitialTab(tab);
    setShowProfileDialog(true);
  };

  const handleViewPayments = (player) => {
    setSelectedPlayer(player);
    // Implement logic to open profile with payments tab active
    // For now, it opens the standard profile
    setShowProfileDialog(true); 
  };

  const handleDeletePlayer = async (player) => {
    const confirmMessage = player.estado_renovacion === "no_renueva" 
      ? `¿Eliminar a ${player.nombre}?\n\nEste jugador ha sido marcado como "NO RENUEVA" y será archivado en el histórico.`
      : `¿Eliminar a ${player.nombre}?\n\nEl jugador será archivado en el histórico y podrá ser restaurado si es necesario.`;
    
    if (!confirm(confirmMessage)) return;
    
    deletePlayerMutation.mutate(player.id);
  };

  const handleBackupExcel = () => {
    try {
      if (!allPlayers || allPlayers.length === 0) {
        toast.error("No hay jugadores que exportar");
        return;
      }
      // Aplanar TODOS los campos del jugador (incluida ficha médica) para el respaldo
      const rows = allPlayers.map(p => {
        const fm = p.ficha_medica || {};
        return {
          ID: p.id,
          Nombre: p.nombre || '',
          Categoría: p.deporte || '',
          Categoría_Principal: p.categoria_principal || '',
          Categorías_Adicionales: (p.categorias || []).join(', '),
          Fecha_Nacimiento: p.fecha_nacimiento || '',
          Mayor_Edad: p.es_mayor_edad ? 'Sí' : 'No',
          Posición: p.posicion || '',
          Dorsal: p.numero_camiseta || '',
          Dorsal_Preferente: p.dorsal_preferente || '',
          Tipo_Inscripción: p.tipo_inscripcion || '',
          Estado_Renovación: p.estado_renovacion || '',
          Temporada_Renovación: p.temporada_renovacion || '',
          Activo: p.activo ? 'Sí' : 'No',
          Lesionado: p.lesionado ? 'Sí' : 'No',
          Sancionado: p.sancionado ? 'Sí' : 'No',
          Motivo_Indisponibilidad: p.motivo_indisponibilidad || '',
          Tipo_Documento: p.tipo_documento || '',
          DNI_Jugador: p.dni_jugador || '',
          Email_Jugador: p.email_jugador || '',
          Acceso_Jugador_Autorizado: p.acceso_jugador_autorizado ? 'Sí' : 'No',
          Teléfono: p.telefono || '',
          Email_Padre_Tutor_1: p.email_padre || '',
          Nombre_Tutor_Legal: p.nombre_tutor_legal || '',
          DNI_Tutor_Legal: p.dni_tutor_legal || '',
          Nombre_Tutor_2: p.nombre_tutor_2 || '',
          Teléfono_Tutor_2: p.telefono_tutor_2 || '',
          Email_Tutor_2: p.email_tutor_2 || '',
          Dirección: p.direccion || '',
          Municipio: p.municipio || '',
          Tiene_Descuento_Hermano: p.tiene_descuento_hermano ? 'Sí' : 'No',
          Descuento_Aplicado: p.descuento_aplicado || 0,
          Incluye_Seguro: p.incluye_seguro_accidentes ? 'Sí' : 'No',
          Incluye_Ficha_Federativa: p.incluye_ficha_federativa ? 'Sí' : 'No',
          Autorización_Fotografía: p.autorizacion_fotografia || '',
          Acepta_Política_Privacidad: p.acepta_politica_privacidad ? 'Sí' : 'No',
          Fecha_Aceptación_Privacidad: p.fecha_aceptacion_privacidad || '',
          Acepta_Normativa: p.acepta_normativa ? 'Sí' : 'No',
          Versión_Normativa: p.version_normativa_aceptada || '',
          Firma_Jugador_Completada: p.firma_jugador_completada ? 'Sí' : 'No',
          Firma_Tutor_Completada: p.firma_tutor_completada ? 'Sí' : 'No',
          Alergias: fm.alergias || '',
          Medicación: fm.medicacion_habitual || '',
          Condiciones_Médicas: fm.condiciones_medicas || '',
          Grupo_Sanguíneo: fm.grupo_sanguineo || '',
          Emergencia_1_Nombre: fm.contacto_emergencia_nombre || '',
          Emergencia_1_Teléfono: fm.contacto_emergencia_telefono || '',
          Emergencia_2_Nombre: fm.contacto_emergencia_2_nombre || '',
          Emergencia_2_Teléfono: fm.contacto_emergencia_2_telefono || '',
          Lesiones: fm.lesiones || '',
          Observaciones_Médicas: fm.observaciones_medicas || '',
          Observaciones: p.observaciones || '',
          Fecha_Alta: p.created_date || '',
          Fecha_Actualización: p.updated_date || '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `backup_jugadores_CDBustarviejo_${fecha}.xlsx`);
      toast.success(`Backup de ${rows.length} jugadores descargado`);
    } catch (err) {
      console.error('Error generando backup Excel:', err);
      toast.error('Error al generar el backup');
    }
  };

  // Descarga un archivo .vcf con los contactos (Tutor 1 + Tutor 2) de los jugadores filtrados.
  // El archivo se puede abrir desde el móvil para importar todos los contactos a la agenda de golpe.
  const handleDownloadContactsVcf = () => {
    const cards = [];
    const seen = new Set();
    filteredPlayers.forEach(p => {
      const tutors = [
        { nombre: p.nombre_tutor_legal || `Tutor de ${p.nombre}`, tel: p.telefono, email: p.email_padre },
        { nombre: p.nombre_tutor_2 || `Tutor 2 de ${p.nombre}`, tel: p.telefono_tutor_2, email: p.email_tutor_2 },
      ];
      tutors.forEach(t => {
        if (!t.tel) return;
        const clean = String(t.tel).replace(/\D/g, '');
        if (clean.length < 9) return;
        const withCountry = clean.startsWith('34') ? clean : `34${clean}`;
        const phoneIntl = `+${withCountry}`;
        if (seen.has(phoneIntl)) return;
        seen.add(phoneIntl);
        const cat = p.categoria_principal || p.deporte || '';
        const displayName = `${t.nombre} (${p.nombre}${cat ? ' – ' + cat : ''})`;
        const vcard = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${displayName}`,
          `N:${t.nombre};;;;`,
          `TEL;TYPE=CELL:${phoneIntl}`,
          t.email ? `EMAIL:${t.email}` : null,
          `ORG:CD Bustarviejo${cat ? ' – ' + cat : ''}`,
          'END:VCARD',
        ].filter(Boolean).join('\r\n');
        cards.push(vcard);
      });
    });
    if (cards.length === 0) {
      toast.error("No hay contactos en este filtro");
      return;
    }
    const blob = new Blob([cards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const tag = categoryFilter !== 'all' ? categoryFilter.replace(/\s+/g, '_') : 'todos';
    link.download = `contactos_${tag}_${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`✅ ${cards.length} contactos descargados. Ábrelo en el móvil para importarlos.`);
  };

  const handleExportPlayers = () => {
    const dataToExport = filteredPlayers.map(player => ({
      "Nombre": player.nombre,
      "Categoría": player.deporte,
      "Fecha Nacimiento": player.fecha_nacimiento ? new Date(player.fecha_nacimiento).toLocaleDateString('es-ES') : '',
      "Email Padre/Tutor 1": player.email_padre,
      "Teléfono 1": player.telefono,
      "Email Tutor 2": player.email_tutor_2 || '',
      "Teléfono 2": player.telefono_tutor_2 || '',
      "Dirección": player.direccion || '',
      "Estado": player.activo ? "Activo" : "Inactivo",
      "Tipo Inscripción": player.tipo_inscripcion,
      "Autorización Fotos": player.autorizacion_fotografia || ''
    }));

    // Convertir a CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escapar comas y comillas
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `jugadores_${categoryFilter !== 'all' ? categoryFilter : 'todos'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPlayers = players.filter(player => {
    // FILTRO AUTOMÁTICO: Si permitir_renovaciones = false, ocultar jugadores pendientes de renovar (temporada anterior)
    if (!activeSeason?.permitir_renovaciones && player.estado_renovacion === "pendiente") {
      return false;
    }

    const matchesSearch = searchTerm === "" || 
      player.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email_padre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.telefono?.includes(searchTerm);
    
    // Filtro de deporte: buscar si el deporte del jugador CONTIENE el texto del filtro
    const matchesSport = sportFilter === "all" || 
      (sportFilter === "Fútbol" && player.deporte?.includes("Fútbol") && !player.deporte?.includes("Femenino")) ||
      (sportFilter === "Fútbol Femenino" && player.deporte === "Fútbol Femenino") ||
      (sportFilter === "Baloncesto" && player.deporte?.includes("Baloncesto"));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && player.activo) ||
      (statusFilter === "inactive" && !player.activo);
    
    const matchesRenewalStatus = statusRenewalFilter === "all" ||
      (statusRenewalFilter === "renovado" && player.tipo_inscripcion === "Renovación" && player.activo) ||
      (statusRenewalFilter === "nuevo" && player.tipo_inscripcion === "Nueva Inscripción" && player.activo) ||
      (statusRenewalFilter === "pendiente" && player.estado_renovacion === "pendiente" && player.temporada_renovacion === activeSeason?.temporada) ||
      (statusRenewalFilter === "no_renueva" && player.estado_renovacion === "no_renueva" && player.temporada_renovacion === activeSeason?.temporada);
    
    // Filtro de categoría: comparar con categoria_principal Y con deporte (legacy)
    const playerCat = player.categoria_principal || player.deporte;
    const matchesCategory = categoryFilter === "all" || playerCat === categoryFilter || player.deporte === categoryFilter;
    
    const matchesRevision = !filterRevisionCategoria || player.categoria_requiere_revision === true;
    
    return matchesSearch && matchesSport && matchesStatus && matchesRenewalStatus && matchesCategory && matchesRevision;
  });

  // Paginación
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sportFilter, statusFilter, categoryFilter]);

  // Obtener todas las categorías únicas (usar categoria_principal con fallback a deporte)
  const allCategories = [...new Set(players.map(p => p.categoria_principal || p.deporte).filter(Boolean))].sort();

  // Contar jugadores por estado
  const allCount = players.length;
  const activeCount = players.filter(p => p.activo).length;
  const inactiveCount = players.filter(p => !p.activo).length;
  const futbolCount = players.filter(p => p.deporte?.includes("Fútbol") && !p.deporte?.includes("Femenino")).length;
  const futbolFemeninoCount = players.filter(p => p.deporte === "Fútbol Femenino").length;
  const baloncestoCount = players.filter(p => p.deporte?.includes("Baloncesto")).length;

  // Contadores para filtro de renovación
  const renovadosCount = allPlayers.filter(p => p.tipo_inscripcion === "Renovación" && p.activo).length;
  const nuevosCount = allPlayers.filter(p => p.tipo_inscripcion === "Nueva Inscripción" && p.activo).length;
  const pendientesCount = allPlayers.filter(p => p.estado_renovacion === "pendiente" && p.temporada_renovacion === activeSeason?.temporada).length;
  const noRenuevanCount = allPlayers.filter(p => p.estado_renovacion === "no_renueva" && p.temporada_renovacion === activeSeason?.temporada).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Panel de estadísticas de renovación - SOLO SI HAY RENOVACIONES PERMITIDAS Y HAY JUGADORES PENDIENTES */}
      {isAdmin && activeSeason?.permitir_renovaciones && allPlayers.some(p => p.estado_renovacion === "pendiente" && p.temporada_renovacion === activeSeason?.temporada) && (
        <RenewalStatsPanel allPlayers={allPlayers} seasonConfig={activeSeason} />
      )}

      {/* Banner de jugadores con categoría a revisar */}
      {playersNeedingReview > 0 && isAdmin && (
        <Card className="border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 text-lg mb-1">
                  ⚠️ {playersNeedingReview} Jugador{playersNeedingReview > 1 ? 'es' : ''} con Categoría a Revisar
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  La categoría seleccionada no coincide con la edad del jugador. Revisa si es correcto o si el padre se equivocó.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setFilterRevisionCategoria(true);
                    setShowAdvancedFilters(true);
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  🔍 Filtrar Jugadores a Revisar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas resumen */}
      {(isAdmin || isTreasurer) && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="border-none shadow-md bg-white cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all" onClick={() => { setStatusFilter("active"); setCategoryFilter("all"); setSportFilter("all"); }}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{activeCount}</p>
              <p className="text-xs text-slate-600 mt-1">Activos</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-white cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all" onClick={() => { setStatusFilter("inactive"); setCategoryFilter("all"); setSportFilter("all"); }}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{inactiveCount}</p>
              <p className="text-xs text-slate-600 mt-1">Inactivos</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-white cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all" onClick={() => { setSportFilter("Fútbol"); setStatusFilter("all"); setCategoryFilter("all"); }}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{futbolCount}</p>
              <p className="text-xs text-slate-600 mt-1">⚽ Fútbol</p>
            </CardContent>
          </Card>
          {futbolFemeninoCount > 0 && (
            <Card className="border-none shadow-md bg-white cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all" onClick={() => { setSportFilter("Fútbol Femenino"); setStatusFilter("all"); setCategoryFilter("all"); }}>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-pink-600">{futbolFemeninoCount}</p>
                <p className="text-xs text-slate-600 mt-1">⚽ Femenino</p>
              </CardContent>
            </Card>
          )}
          <Card className="border-none shadow-md bg-white cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all" onClick={() => { setSportFilter("Baloncesto"); setStatusFilter("all"); setCategoryFilter("all"); }}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{baloncestoCount}</p>
              <p className="text-xs text-slate-600 mt-1">🏀 Basket</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-white cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all" onClick={() => { setStatusRenewalFilter("nuevo"); setStatusFilter("all"); setCategoryFilter("all"); setSportFilter("all"); }}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{nuevosCount}</p>
              <p className="text-xs text-slate-600 mt-1">✨ Nuevos</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin || isTreasurer ? "Jugadores" : isCoach ? "Mis Hijos" : "Mis Jugadores"}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin || isTreasurer ? "Gestión de fichas y plantilla" : "Jugadores registrados a tu nombre"}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && filteredPlayers.length > 0 && (
            <Button
              onClick={handleDownloadContactsVcf}
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50 bg-green-50/50"
              title="Descarga un archivo de contactos del filtro actual. Ábrelo en el móvil para guardarlos en tu agenda y crear grupos en WhatsApp."
            >
              <Contact className="w-5 h-5 mr-2" />
              Descargar contactos
            </Button>
          )}
          {isAdmin && filteredPlayers.length > 0 && (
            <Button
              onClick={handleExportPlayers}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="w-5 h-5 mr-2" />
              Exportar CSV ({filteredPlayers.length})
            </Button>
          )}
          {isAdmin && allPlayers.length > 0 && (
            <Button
              onClick={handleBackupExcel}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
              title="Descargar backup completo de TODOS los jugadores en Excel"
            >
              <Download className="w-5 h-5 mr-2" />
              Backup Excel ({allPlayers.length})
            </Button>
          )}
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingPlayer(null);
                setShowForm(!showForm);
              }}
              className="bg-orange-600 hover:bg-orange-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Jugador
            </Button>
          )}
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
          />
        )}
      </AnimatePresence>

      {/* Búsqueda Avanzada */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={showAdvancedFilters ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            {(searchTerm || sportFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all") && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSearchTerm("");
                  setSportFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {showAdvancedFilters && (
            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos ({allCount})</SelectItem>
                      <SelectItem value="active">✅ Activos ({activeCount})</SelectItem>
                      <SelectItem value="inactive">❌ Inactivos ({inactiveCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tipo Inscripción</label>
                    <Select value={statusRenewalFilter} onValueChange={setStatusRenewalFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="renovado">🔄 Renovados ({renovadosCount})</SelectItem>
                        <SelectItem value="nuevo">✨ Nuevos ({nuevosCount})</SelectItem>
                        {activeSeason?.permitir_renovaciones && (
                          <>
                            <SelectItem value="pendiente">⏳ Pendientes Renovar ({pendientesCount})</SelectItem>
                            <SelectItem value="no_renueva">❌ No Renuevan ({noRenuevanCount})</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Deporte</label>
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Fútbol">⚽ Fútbol ({futbolCount})</SelectItem>
                      <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino ({futbolFemeninoCount})</SelectItem>
                      <SelectItem value="Baloncesto">🏀 Baloncesto ({baloncestoCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Categoría</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat} ({players.filter(p => (p.categoria_principal || p.deporte) === cat).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <Checkbox
                    id="filter-revision"
                    checked={filterRevisionCategoria}
                    onCheckedChange={setFilterRevisionCategoria}
                  />
                  <Label htmlFor="filter-revision" className="cursor-pointer font-medium text-orange-900">
                    🔍 Solo categorías a revisar ({playersNeedingReview})
                  </Label>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontraron jugadores</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {paginatedPlayers.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  onEdit={isAdmin ? handleEdit : null}
                  onViewProfile={handleViewProfile}
                  onDelete={isAdmin ? handleDeletePlayer : null}
                  schedules={schedules}
                  payments={payments}
                  seasonConfig={activeSeason}
                  isCoachOrCoordinator={isCoach || user?.es_coordinador}
                  customPlans={customPlans}
                  onCreateCustomPlan={isAdmin ? (p) => {
                    setSelectedPlayerForPlan(p);
                    setShowCustomPlanForm(true);
                  } : null}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="min-w-[100px]"
              >
                ← Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and adjacent pages
                    return page === 1 || 
                           page === totalPages || 
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="text-slate-400 px-2">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-orange-600 hover:bg-orange-700" : ""}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="min-w-[100px]"
              >
                Siguiente →
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-slate-600">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} de {filteredPlayers.length} jugadores
          </div>
        </>
      )}

      {selectedPlayer && (
        <PlayerProfileDialog
          player={selectedPlayer}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onEdit={isAdmin ? handleEdit : null}
          payments={payments}
          evaluations={evaluations}
          attendances={attendances}
          isAdmin={isAdmin}
          initialTab={initialTab}
        />
      )}

      <CustomPaymentPlanForm
        open={showCustomPlanForm}
        onClose={() => {
          setShowCustomPlanForm(false);
          setSelectedPlayerForPlan(null);
        }}
        player={selectedPlayerForPlan}
        existingPlan={null}
        onSubmit={(planData) => createCustomPlanMutation.mutate(planData)}
        isSubmitting={createCustomPlanMutation.isPending}
      />

      <RecalcCuotasDialog
        open={showRecalcDialog}
        onOpenChange={setShowRecalcDialog}
        plan={recalcPlan}
        playerName={recalcPlayerName}
        adminEmail={user?.email}
        onApplied={() => {
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          setRecalcPlan(null);
        }}
        onSkipped={() => setRecalcPlan(null)}
      />
    </div>
  );
}