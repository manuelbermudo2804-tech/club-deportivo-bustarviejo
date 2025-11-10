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
  const [userSport, setUserSport] = useState(null);
  const [userCategory, setUserCategory] = useState(null);
  
  const queryClient = useQueryClient();

  // Get current user info to filter announcements for parents
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
        
        if (user.role !== "admin") {
          // Get user's players to determine relevant announcements
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || p.email === user.email
          );
          
          if (myPlayers.length > 0) {
            // Determine sports
            const hasFutbol = myPlayers.some(p => p.deporte === "Fútbol");
            const hasBaloncesto = myPlayers.some(p => p.deporte === "Baloncesto");
            
            if (hasFutbol && hasBaloncesto) {
              setUserSport("Ambos");
            } else if (hasFutbol) {
              setUserSport("Fútbol");
            } else if (hasBaloncesto) {
              setUserSport("Baloncesto");
            }
            
            // Get all categories
            const categories = [...new Set(myPlayers.map(p => p.categoria))];
            setUserCategory(categories);
          }
        }
      } catch (error) {
        setIsAdmin(false);
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
    enabled: isAdmin,
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData) => {
      const announcement = await base44.entities.Announcement.create(announcementData);
      
      // If email should be sent
      if (announcementData.enviar_email && !announcementData.email_enviado) {
        await sendAnnouncementEmails(announcement, announcementData);
      }
      
      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setEditingAnnouncement(null);
      toast.success("Anuncio publicado correctamente");
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, announcementData }) => base44.entities.Announcement.update(id, announcementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setEditingAnnouncement(null);
      toast.success("Anuncio actualizado correctamente");
    },
  });

  const sendAnnouncementEmails = async (announcement, data) => {
    try {
      // Filter recipients based on type
      let recipients = [];
      
      if (data.destinatarios_tipo === "Todos") {
        recipients = players.map(p => p.email_padre || p.email).filter(Boolean);
      } else if (data.destinatarios_tipo === "Fútbol") {
        recipients = players
          .filter(p => p.deporte === "Fútbol")
          .map(p => p.email_padre || p.email)
          .filter(Boolean);
      } else if (data.destinatarios_tipo === "Baloncesto") {
        recipients = players
          .filter(p => p.deporte === "Baloncesto")
          .map(p => p.email_padre || p.email)
          .filter(Boolean);
      } else if (data.destinatarios_tipo === "Categoría Específica") {
        recipients = players
          .filter(p => p.categoria === data.categoria_destino)
          .map(p => p.email_padre || p.email)
          .filter(Boolean);
      }

      // Remove duplicates
      recipients = [...new Set(recipients)];

      // Send email to each recipient
      for (const email of recipients) {
        await base44.integrations.Core.SendEmail({
          from_name: "CF Bustarviejo",
          to: email,
          subject: `[${announcement.prioridad}] ${announcement.titulo}`,
          body: `
${announcement.contenido}

---
CF Bustarviejo
Temporada ${new Date().getFullYear()}/${new Date().getFullYear() + 1}
          `
        });
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Mark as email sent
      await base44.entities.Announcement.update(announcement.id, {
        ...announcement,
        email_enviado: true
      });

      toast.success(`Emails enviados a ${recipients.length} destinatarios`);
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Error al enviar algunos emails");
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

  // Filter announcements based on user role
  const visibleAnnouncements = announcements.filter(announcement => {
    // Admins see all
    if (isAdmin) return true;
    
    // Parents only see published
    if (!announcement.publicado) return false;
    
    // Check if announcement is relevant to user
    if (announcement.destinatarios_tipo === "Todos") return true;
    
    if (announcement.destinatarios_tipo === "Fútbol") {
      return userSport === "Fútbol" || userSport === "Ambos";
    }
    
    if (announcement.destinatarios_tipo === "Baloncesto") {
      return userSport === "Baloncesto" || userSport === "Ambos";
    }
    
    if (announcement.destinatarios_tipo === "Categoría Específica") {
      return userCategory?.includes(announcement.categoria_destino);
    }
    
    return false;
  });

  // Apply priority filter
  const filteredAnnouncements = priorityFilter === "all" 
    ? visibleAnnouncements 
    : visibleAnnouncements.filter(a => a.prioridad === priorityFilter);

  const urgentCount = visibleAnnouncements.filter(a => a.prioridad === "Urgente").length;
  const importantCount = visibleAnnouncements.filter(a => a.prioridad === "Importante").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-orange-600" />
            Anuncios y Comunicados
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Envía noticias y avisos a las familias" : "Mantente informado de las novedades del club"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingAnnouncement(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Anuncio
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
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

      {/* Priority Filter */}
      <div className="flex items-center gap-3">
        <Tabs value={priorityFilter} onValueChange={setPriorityFilter}>
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="all" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
              Todos
            </TabsTrigger>
            <TabsTrigger value="Urgente" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              🚨 Urgente {urgentCount > 0 && `(${urgentCount})`}
            </TabsTrigger>
            <TabsTrigger value="Importante" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
              ⚠️ Importante {importantCount > 0 && `(${importantCount})`}
            </TabsTrigger>
            <TabsTrigger value="Normal" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              ℹ️ Normal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">📢</div>
          <p className="text-slate-500 text-lg">No hay anuncios {priorityFilter !== "all" ? `de prioridad ${priorityFilter}` : ""}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={handleEdit}
                isAdmin={isAdmin}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}