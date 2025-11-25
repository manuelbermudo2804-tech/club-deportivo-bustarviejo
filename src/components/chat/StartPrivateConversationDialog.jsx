import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, User, Users } from "lucide-react";
import { toast } from "sonner";

export default function StartPrivateConversationDialog({ 
  open, 
  onOpenChange, 
  user,
  myPlayers,
  existingConversations,
  onConversationCreated 
}) {
  const queryClient = useQueryClient();

  // Obtener usuarios del sistema que sean entrenadores/coordinadores
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForChat'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  // Filtrar staff relevante para mis jugadores
  const availableStaff = useMemo(() => {
    if (!myPlayers.length || !allUsers.length) return [];

    const myCategories = [...new Set(myPlayers.map(p => p.deporte))];
    
    return allUsers.filter(u => {
      // Debe ser entrenador o coordinador
      if (!u.es_entrenador && !u.es_coordinador) return false;
      
      // No mostrarme a mí mismo
      if (u.email === user?.email) return false;
      
      // Debe entrenar alguna de las categorías de mis hijos
      const categoriasEntrena = u.categorias_entrena || [];
      return categoriasEntrena.some(cat => myCategories.includes(cat));
    }).map(staff => {
      // Obtener categorías en común
      const myCategories = [...new Set(myPlayers.map(p => p.deporte))];
      const categoriasComunes = (staff.categorias_entrena || []).filter(cat => myCategories.includes(cat));
      const jugadoresRelacionados = myPlayers.filter(p => categoriasComunes.includes(p.deporte));
      
      return {
        ...staff,
        categoriasComunes,
        jugadoresRelacionados,
        rol: staff.es_coordinador ? 'coordinador' : 'entrenador'
      };
    });
  }, [allUsers, myPlayers, user?.email]);

  const createConversationMutation = useMutation({
    mutationFn: async ({ staff, categoria }) => {
      // Verificar si ya existe conversación con este staff para esta categoría
      const existing = existingConversations.find(c => 
        c.participante_staff_email === staff.email && c.categoria === categoria
      );
      
      if (existing) {
        return existing;
      }

      const jugadoresRelacionados = myPlayers
        .filter(p => p.deporte === categoria)
        .map(p => ({ jugador_id: p.id, jugador_nombre: p.nombre }));

      const newConv = await base44.entities.PrivateConversation.create({
        participante_familia_email: user.email,
        participante_familia_nombre: user.full_name,
        participante_staff_email: staff.email,
        participante_staff_nombre: staff.full_name,
        participante_staff_rol: staff.rol,
        categoria: categoria,
        jugadores_relacionados: jugadoresRelacionados,
        no_leidos_familia: 0,
        no_leidos_staff: 0,
        archivada: false
      });

      return newConv;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['myPrivateConversations'] });
      onOpenChange(false);
      onConversationCreated?.(conversation);
      toast.success("Conversación iniciada");
    },
    onError: (error) => {
      toast.error("Error al crear conversación");
      console.error(error);
    }
  });

  const handleStartConversation = (staff, categoria) => {
    createConversationMutation.mutate({ staff, categoria });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Nueva Conversación Privada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {availableStaff.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay entrenadores disponibles</p>
              <p className="text-xs mt-1">Los entrenadores de tus hijos aparecerán aquí</p>
            </div>
          ) : (
            availableStaff.map(staff => (
              <Card key={staff.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900">{staff.full_name}</h3>
                      <p className="text-xs text-slate-500">
                        {staff.rol === 'coordinador' ? '📋 Coordinador' : '🎓 Entrenador'}
                      </p>
                      
                      <div className="mt-2 space-y-1">
                        {staff.categoriasComunes.map(cat => {
                          const jugadores = staff.jugadoresRelacionados.filter(j => j.deporte === cat);
                          const existeConv = existingConversations.some(c => 
                            c.participante_staff_email === staff.email && c.categoria === cat
                          );
                          
                          return (
                            <div key={cat} className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <Badge variant="outline" className="text-xs">
                                  {cat}
                                </Badge>
                                <span className="text-xs text-slate-500 ml-2">
                                  ({jugadores.map(j => j.nombre).join(", ")})
                                </span>
                              </div>
                              <Button
                                size="sm"
                                disabled={createConversationMutation.isPending}
                                onClick={() => handleStartConversation(staff, cat)}
                                className={existeConv 
                                  ? "bg-slate-500 hover:bg-slate-600 text-xs h-7"
                                  : "bg-green-600 hover:bg-green-700 text-xs h-7"
                                }
                              >
                                {existeConv ? "Abrir" : "Iniciar"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}