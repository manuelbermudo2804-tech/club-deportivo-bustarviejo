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

export default function Announcements() {
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [userSports, setUserSports] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
        setIsCoach(user.es_entrenador === true);
        
        if (user.role !== "admin") {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || p.email === user.email
          );
          
          if (myPlayers.length > 0) {
            const sports = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
            setUserSports(sports);
          }
        }
      } catch (error) {
        setIsAdmin(false);
        setIsCoach(false);
      }
    };
    checkUser();
  }, []);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-fecha_publicacion'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: isAdmin || isCoach,
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData) => {
      const announcement = await base44.entities.Announcement.create(announcementData);
      
      if (announcementData.enviar_email && !announcementData.email_enviado) {
        await sendAnnouncementEmails(announcement, announcementData);
      }
      
      if (announcementData.enviar_chat && !announcementData.chat_enviado) {
        await sendAnnouncementToChats(announcement, announcementData);
      }
      
      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setShowForm(false);
      setEditingAnnouncement(null);
      toast.success("Anuncio publicado");
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
      
      if (data.destinatarios_tipo === "Todos") {
        players.forEach(p => {
          if (p.email_padre) recipients.push(p.email_padre);
          if (p.email_tutor_2) recipients.push(p.email_tutor_2);
        });
      } else {
        players.filter(p => p.deporte === data.destinatarios_tipo).forEach(p => {
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

════════════════════════════════════════
Información del anuncio:
════════════════════════════════════════
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

════════════════════════════════════════
Datos de contacto:
════════════════════════════════════════
Email: cdbustarviejo@gmail.com
Ubicación: Bustarviejo, Madrid
            `;

      for (const email of recipients) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: email,
            subject: subject,
            body: body
          });
          successCount++;
        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
          errorCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await base44.entities.Announcement.update(announcement.id, {
        ...announcement,
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

  const sendAnnouncementToChats = async (announcement, data) => {
    try {
      let targetGroups = [];
      
      if (data.destinatarios_tipo === "Todos") {
        const allSports = [...new Set(players.map(p => p.deporte).filter(Boolean))];
        targetGroups = allSports;
      } else {
        targetGroups = [data.destinatarios_tipo];
      }

      if (targetGroups.length === 0) {
        toast.warning("No hay grupos disponibles para enviar el mensaje");
        return;
      }

      const chatEmoji = {
        "Urgente": "🚨",
        "Importante": "⚠️",
        "Normal": "📢"
      };

      const mensaje = `${chatEmoji[announcement.prioridad]} ANUNCIO ${announcement.prioridad.toUpperCase()}\n\n📌 ${announcement.titulo}\n\n${announcement.contenido}\n\n${announcement.fecha_expiracion ? `⏰ Válido hasta: ${new Date(announcement.fecha_expiracion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` : ''}`;

      let sentCount = 0;

      for (const grupo of targetGroups) {
        try {
          await base44.entities.ChatMessage.create({
            remitente_email: "admin@cdbustarviejo.com",
            remitente_nombre: "Administración CF Bustarviejo",
            mensaje: mensaje,
            prioridad: announcement.prioridad,
            tipo: "admin_a_grupo",
            deporte: grupo,
            categoria: "",
            grupo_id: grupo,
            leido: false,
            archivos_adjuntos: []
          });
          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error sending to chat ${grupo}:`, error);
        }
      }

      await base44.entities.Announcement.update(announcement.id, {
        ...announcement,
        chat_enviado: true
      });

      if (sentCount > 0) {
        toast.success(`💬 Anuncio enviado a ${sentCount} chat${sentCount !== 1 ? 's' : ''} de grupo`);
      } else {
        toast.error("Error al enviar a los chats");
      }
    } catch (error) {
      console.error("Error sending to chats:", error);
      toast.error("Error al enviar a los chats");
    }
  };

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
        const publishedDate = new Date(announcement.fecha_publicacion);
        
        // Calculate milliseconds difference
        const diffMs = now - publishedDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Filter by fecha_expiracion if exists
        if (announcement.fecha_expiracion) {
          const expirationDate = new Date(announcement.fecha_expiracion);
          if (now > expirationDate) return false;
        }
        
        // Urgente: solo el mismo día (desaparece después de 24h)
        if (announcement.prioridad === "Urgente") {
          if (diffHours >= 24) return false;
        }
        
        // Importante: hasta 48 horas (2 días)
        if (announcement.prioridad === "Importante") {
          if (diffHours >= 48) return false;
        }
        
        // Normal: hasta 72 horas (3 días)
        if (announcement.prioridad === "Normal") {
          if (diffHours >= 72) return false;
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
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-600" />
            Anuncios
          </h1>
          <p className="text-slate-600 mt-1 text-sm">Comunicados del club</p>
        </div>
        {(isAdmin || isCoach) && (
          <Button
            onClick={() => {
              setEditingAnnouncement(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (isAdmin || isCoach) && (
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
        <TabsList className="bg-white shadow-sm flex-wrap h-auto p-1">
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
        <div className="text-center py-8 bg-white rounded-xl shadow-md">
          <div className="text-4xl mb-2">📢</div>
          <p className="text-slate-500 text-sm">No hay anuncios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {sortedAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onEdit={handleEdit}
                  onDelete={(isAdmin || isCoach) ? handleDelete : null}
                  isAdmin={isAdmin || isCoach}
                />
              ))}
            </AnimatePresence>
          </div>
      )}
    </div>
  );
}