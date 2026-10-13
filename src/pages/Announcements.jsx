import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import AnnouncementForm from "../components/announcements/AnnouncementForm";
import AnnouncementCard from "../components/announcements/AnnouncementCard";
import AIGenerator from "../components/announcements/AIGenerator";
import EmptyState from "../components/common/EmptyState";
import TemplateManager from "../components/announcements/TemplateManager";
import { playerInCategory, playerAllCategories } from "../components/utils/playerCategoryFilter";
import { playerBelongsToUser } from "../components/utils/playerBelongsToUser";

export default function Announcements() {
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);
  const [user, setUser] = useState(null);
  const [userSports, setUserSports] = useState([]);
  const canManage = isAdmin || isCoach || isCoordinator || isTreasurer;
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsCoach(currentUser.es_entrenador === true);
        setIsCoordinator(currentUser.es_coordinador === true);
        setIsTreasurer(currentUser.es_tesorero === true);
        
        if (currentUser.role !== "admin") {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => playerBelongsToUser(p, currentUser.email));
          
          if (myPlayers.length > 0) {
            // Reunir TODAS las categorías del jugador (categoria_principal + deporte legacy + categorias[])
            const sports = [...new Set(myPlayers.flatMap(p => playerAllCategories(p)))];
            setUserSports(sports);
          }
        }
      } catch (error) {
          setIsAdmin(false);
          setIsCoach(false);
          setIsCoordinator(false);
          setIsTreasurer(false);
        }
    };
    checkUser();
    
    // Marcar todos los anuncios visibles como leídos INMEDIATAMENTE
    const markAnnouncementsAsRead = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role === "admin") return;
        
        const allAnnouncements = await base44.entities.Announcement.list();
        const allPlayers = await base44.entities.Player.list();
        const myPlayers = allPlayers.filter(p => playerBelongsToUser(p, currentUser.email));
        const sports = [...new Set(myPlayers.flatMap(p => playerAllCategories(p)))];
        
        let marked = 0;
        for (const announcement of allAnnouncements) {
          if (!announcement.publicado) continue;
          
          // Comprobar segmentación por email específico
          const targetedEmails = Array.isArray(announcement.destinatarios_emails) ? announcement.destinatarios_emails : [];
          if (targetedEmails.length > 0 && !targetedEmails.includes(currentUser.email)) continue;
          
          const isRelevant = announcement.destinatarios_tipo === "Todos" || sports.includes(announcement.destinatarios_tipo);
          if (!isRelevant) continue;
          
          const alreadyRead = announcement.leido_por?.some(l => l.email === currentUser.email);
          if (alreadyRead) continue;
          
          const leidoPor = announcement.leido_por || [];
          leidoPor.push({
            email: currentUser.email,
            nombre: currentUser.full_name,
            fecha: new Date().toISOString()
          });
          
          await base44.entities.Announcement.update(announcement.id, {
            leido_por: leidoPor
          });
          marked++;
        }
        
        if (marked > 0) {
          console.log(`✅ Marcados ${marked} anuncios como leídos`);
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
          queryClient.invalidateQueries({ queryKey: ['announcementsAlerts'] });
        }
      } catch (error) {
        console.error("Error marking announcements as read:", error);
      }
    };
    
    // Ejecutar INMEDIATAMENTE
    const timeout = setTimeout(markAnnouncementsAsRead, 500);
    
    // Scroll al anuncio si viene desde AlertCenter
    const urlParams = new URLSearchParams(window.location.search);
    const announcementId = urlParams.get('id');
    if (announcementId) {
      setTimeout(() => {
        const element = document.getElementById(`announcement-${announcementId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-orange-500', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-orange-500', 'ring-opacity-50');
          }, 3000);
        }
      }, 500);
    }
    
    return () => clearTimeout(timeout);
  }, [queryClient]);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-fecha_publicacion'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: canManage,
  });

  const createAnnouncementMutation = useMutation({
      mutationFn: async (announcementData) => {
          const { enviar_chat, ...rest } = announcementData || {};
          // Calcular fecha de caducidad si es por horas
          let dataToSave = { ...rest };
          if (rest.tipo_caducidad === "horas" && rest.duracion_horas) {
            const publicacionDate = new Date(rest.fecha_publicacion);
            const caducidadDate = new Date(publicacionDate.getTime() + (rest.duracion_horas * 60 * 60 * 1000));
            dataToSave.fecha_caducidad_calculada = caducidadDate.toISOString();
          }

          const announcement = await base44.entities.Announcement.create(dataToSave);

          if (rest.enviar_email && !rest.email_enviado) {
            await sendAnnouncementEmails(announcement, rest);
          }
          if (enviar_chat) {
            await sendAnnouncementToSystemChat(announcement, rest);
          }

          return announcement;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setEditingAnnouncement(null);
      toast.success("📢 Anuncio publicado y aparecerá en el Centro de Alertas");
    },
    onError: (error) => {
      console.error("Error creating announcement:", error);
      toast.error("Error al publicar el anuncio");
    }
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, announcementData }) => base44.entities.Announcement.update(id, announcementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setEditingAnnouncement(null);
      toast.success("Anuncio actualizado");
    },
    onError: (error) => {
      console.error("Error updating announcement:", error);
      toast.error("Error al actualizar el anuncio");
    }
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success("Anuncio eliminado");
    },
    onError: (error) => {
      console.error("Error deleting announcement:", error);
      toast.error("Error al eliminar el anuncio");
    }
  });

  const sendAnnouncementEmails = async (announcement, data) => {
    try {
      let recipients = [];

      // Si hay usuarios específicos marcados, SOLO se envía a ellos (ignora categoría).
      const targetedEmails = Array.isArray(data.destinatarios_emails)
        ? data.destinatarios_emails
        : (data.destinatarios_emails || "").split(",").map(s => s.trim()).filter(Boolean);

      if (targetedEmails.length > 0) {
        recipients = targetedEmails;
      } else if (data.destinatarios_tipo === "Todos") {
        players.forEach(p => {
          if (p.email_padre) recipients.push(p.email_padre);
          if (p.email_tutor_2) recipients.push(p.email_tutor_2);
        });
      } else {
        players.filter(p => playerInCategory(p, data.destinatarios_tipo)).forEach(p => {
          if (p.email_padre) recipients.push(p.email_padre);
          if (p.email_tutor_2) recipients.push(p.email_tutor_2);
        });
      }

      recipients = [...new Set(recipients)].filter(Boolean);

      if (recipients.length === 0) {
        toast.warning("No hay destinatarios con email para este anuncio");
        return;
      }

      toast.info(`Enviando emails a ${recipients.length} destinatarios...`);

      let successCount = 0;
      let errorCount = 0;

      const priorityEmoji = {
        "Urgente": "URGENTE",
        "Importante": "IMPORTANTE",
        "Normal": "INFO"
      };

      const subject = `${priorityEmoji[announcement.prioridad]} - ${announcement.titulo} - CD Bustarviejo`;

      const body = `
Estimadas familias,

${announcement.contenido}

──────────
Información del anuncio:
Prioridad: ${announcement.prioridad}
Destinatarios: ${announcement.destinatarios_tipo}
Publicado: ${new Date(announcement.fecha_publicacion).toLocaleDateString('es-ES', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
${announcement.fecha_expiracion ? `Válido hasta: ${new Date(announcement.fecha_expiracion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}

Para más información, acceda a la aplicación del club.


Atentamente,

CD Bustarviejo
Equipo de Administración

──────────
Contacto: info@cdbustarviejo.com
Bustarviejo, Madrid
            `;

      for (const email of recipients) {
        try {
          console.log('📤 [Announcements] Enviando anuncio a:', email);
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject: subject,
            html: body
          });
          console.log('✅ [Announcements] Email enviado a:', email);
          successCount++;
        } catch (error) {
          console.error(`❌ [Announcements] Error sending email to ${email}:`, error);
          errorCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await base44.entities.Announcement.update(announcement.id, {
        email_enviado: true
      });

      if (successCount > 0) {
        toast.success(`✅ Emails enviados correctamente a ${successCount} destinatarios${errorCount > 0 ? ` (${errorCount} fallidos)` : ""}`);
      } else {
        toast.error("❌ Error al enviar todos los emails");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Error al enviar los emails");
    }
  };

  const sendAnnouncementToSystemChat = async (announcement, data) => {
    try {
      // Si hay usuarios específicos marcados, SOLO se publica a sus familias (ignora categoría).
      const targetedEmails = Array.isArray(data.destinatarios_emails)
        ? data.destinatarios_emails
        : (data.destinatarios_emails || "").split(",").map(s => s.trim()).filter(Boolean);

      const scopePlayers = targetedEmails.length > 0
        ? players.filter(p => targetedEmails.includes(p.email_padre) || targetedEmails.includes(p.email_tutor_2) || targetedEmails.includes(p.email_jugador))
        : (data.destinatarios_tipo === "Todos"
          ? players
          : players.filter(p => playerInCategory(p, data.destinatarios_tipo)));
      const familiesMap = {};
      scopePlayers.forEach(p => {
        // Incluir email_padre, email_tutor_2 y email_jugador (si no hay padre) — coherencia con email
        const familyEmails = [p.email_padre, p.email_tutor_2];
        if (!p.email_padre && p.email_jugador) familyEmails.push(p.email_jugador);
        familyEmails.filter(Boolean).forEach(email => {
          if (!familiesMap[email]) {
            familiesMap[email] = {
              email,
              nombre_tutor: p.nombre_tutor_legal || "Familia",
              jugadores: []
            };
          }
          familiesMap[email].jugadores.push({ id: p.id, nombre: p.nombre });
        });
      });
      const families = Object.values(familiesMap);
      if (families.length === 0) return;

      const allConvs = await base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 5000);
      const text = `📢 ${announcement.titulo}\n\n${announcement.contenido}`;

      for (const family of families) {
        let conv = allConvs.find(c =>
          c.participante_familia_email === family.email &&
          c.participante_staff_email === 'sistema@cdbustarviejo.com'
        );
        if (!conv) {
          conv = await base44.entities.PrivateConversation.create({
            participante_familia_email: family.email,
            participante_familia_nombre: family.nombre_tutor,
            participante_staff_email: 'sistema@cdbustarviejo.com',
            participante_staff_nombre: '🤖 Sistema de Recordatorios - Administración',
            participante_staff_rol: 'admin',
            categoria: data.destinatarios_tipo || 'Todos',
            jugadores_relacionados: family.jugadores.map(j => ({ jugador_id: j.id, jugador_nombre: j.nombre })),
            ultimo_mensaje: text.slice(0, 100),
            ultimo_mensaje_fecha: new Date().toISOString(),
            ultimo_mensaje_de: 'staff',
            no_leidos_familia: 1,
            archivada: false
          });
        }

        await base44.entities.PrivateMessage.create({
          conversacion_id: conv.id,
          remitente_email: 'sistema@cdbustarviejo.com',
          remitente_nombre: '📢 Anuncios del Club',
          remitente_tipo: 'staff',
          mensaje: text,
          leido: false
        });

        await base44.entities.PrivateConversation.update(conv.id, {
          ultimo_mensaje: text.slice(0, 100),
          ultimo_mensaje_fecha: new Date().toISOString(),
          ultimo_mensaje_de: 'staff',
          no_leidos_familia: (conv.no_leidos_familia || 0) + 1
        });
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (err) {
      console.error("Error enviando al chat del club:", err);
      toast.error("Error al publicar en Mensajes del Club");
    }
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (announcement) => {
      if (!user || isAdmin) return;
      
      const alreadyRead = announcement.leido_por?.some(l => l.email === user.email);
      if (alreadyRead) return;
      
      const leidoPor = announcement.leido_por || [];
      leidoPor.push({
        email: user.email,
        nombre: user.full_name,
        fecha: new Date().toISOString()
      });
      
      await base44.entities.Announcement.update(announcement.id, {
        leido_por: leidoPor
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });

  const handleSubmit = async (announcementData) => {
    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({ id: editingAnnouncement.id, announcementData });
    } else {
      createAnnouncementMutation.mutate(announcementData);
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const handleDelete = (announcement) => {
    if (window.confirm(`¿Estás seguro de eliminar el anuncio "${announcement.titulo}"?`)) {
      deleteAnnouncementMutation.mutate(announcement.id);
    }
  };

  // Filter announcements based on user role and expiration
  const visibleAnnouncements = (isAdmin || isCoach)
    ? announcements 
    : announcements.filter(announcement => {
        // Parents only see published
        if (!announcement.publicado) return false;
        
        const now = new Date();
        
        // Verificar caducidad según tipo
        if (announcement.tipo_caducidad === "horas" && announcement.fecha_caducidad_calculada) {
          if (now > new Date(announcement.fecha_caducidad_calculada)) return false;
        } else if (announcement.fecha_expiracion) {
          if (now > new Date(announcement.fecha_expiracion)) return false;
        }
        
        // Si hay segmentación por email específico, solo verlo quien esté en la lista
        const targetedEmails = Array.isArray(announcement.destinatarios_emails) ? announcement.destinatarios_emails : [];
        if (targetedEmails.length > 0) {
          return targetedEmails.includes(user?.email);
        }
        
        // Check if announcement is relevant to user
        if (announcement.destinatarios_tipo === "Todos") return true;
        return userSports.includes(announcement.destinatarios_tipo);
      });

  // Apply priority filter
  const filteredAnnouncements = priorityFilter === "all" 
    ? visibleAnnouncements 
    : visibleAnnouncements.filter(a => a.prioridad === priorityFilter);

  // Sort: Pinned first, then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.destacado && !b.destacado) return -1;
    if (!a.destacado && b.destacado) return 1;
    return new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion);
  });

  const urgentCount = visibleAnnouncements.filter(a => a.prioridad === "Urgente").length;
  const importantCount = visibleAnnouncements.filter(a => a.prioridad === "Importante").length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
              <Megaphone className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Comunicación · Club Deportivo Bustarviejo</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Anuncios</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Comunicados, avisos importantes y novedades del club.</p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditingAnnouncement(null);
                setShowForm(!showForm);
              }}
              className="w-full shrink-0 bg-orange-500 text-white hover:bg-orange-600 sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo anuncio
            </Button>
          )}
        </div>
      </section>

      {isAdmin && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <AIGenerator />
          <TemplateManager />
        </div>
      )}

      <AnimatePresence>
        {showForm && canManage && (
          <AnnouncementForm
            announcement={editingAnnouncement}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAnnouncement(null);
            }}
            isSubmitting={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
          />
        )}
      </AnimatePresence>

      <Tabs value={priorityFilter} onValueChange={setPriorityFilter}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 text-xs px-2 py-1">
            Todos
          </TabsTrigger>
          <TabsTrigger value="Urgente" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 text-xs px-2 py-1">
            🚨 Urgente {urgentCount > 0 && `(${urgentCount})`}
          </TabsTrigger>
          <TabsTrigger value="Importante" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 text-xs px-2 py-1">
            ⚠️ Importante {importantCount > 0 && `(${importantCount})`}
          </TabsTrigger>
          <TabsTrigger value="Normal" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 text-xs px-2 py-1">
            ℹ️ Normal
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : sortedAnnouncements.length === 0 ? (
        <EmptyState
          emoji="📢"
          title="Aún no hay anuncios"
          message="Aquí verás los comunicados oficiales del club: avisos importantes, novedades de la temporada y recordatorios. Te llegarán como notificación."
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {sortedAnnouncements.map((announcement) => (
                <div key={announcement.id} id={`announcement-${announcement.id}`}>
                  <AnnouncementCard
                    announcement={announcement}
                    onEdit={handleEdit}
                    onDelete={canManage ? handleDelete : null}
                    isAdmin={canManage}
                    userEmail={user?.email}
                    onMarkAsRead={markAsReadMutation.mutate}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
      )}
    </div>
  );
}