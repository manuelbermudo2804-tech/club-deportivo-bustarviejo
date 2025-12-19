import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Componente invisible que sincroniza convocatorias con eventos del calendario
export default function CallupEventSync() {
  const queryClient = useQueryClient();

  const { data: callups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    refetchInterval: 30000, // Revisar cada 30 segundos
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      return await base44.entities.Event.create(eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Event.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });

  useEffect(() => {
    const syncCallupsToEvents = async () => {
      for (const callup of callups) {
        if (!callup.publicada) continue; // Solo sincronizar convocatorias publicadas

        // Buscar si ya existe un evento para esta convocatoria
        const existingEvent = events.find(e => 
          e.es_automatico === true && 
          e.titulo === callup.titulo &&
          e.fecha === callup.fecha_partido &&
          e.destinatario_categoria === callup.categoria
        );

        const eventData = {
          titulo: callup.titulo,
          tipo: callup.tipo,
          destinatario_categoria: callup.categoria,
          fecha: callup.fecha_partido,
          fecha_fin: callup.fecha_partido,
          hora: callup.hora_partido,
          ubicacion: callup.ubicacion,
          ubicacion_url: callup.enlace_ubicacion,
          rival: callup.rival,
          local_visitante: callup.local_visitante,
          descripcion: callup.descripcion || `Convocatoria para ${callup.titulo}. Hora de concentración: ${callup.hora_concentracion}`,
          color: "blue",
          publicado: true,
          es_automatico: true,
          creado_por: callup.entrenador_email
        };

        if (existingEvent) {
          // Actualizar evento existente
          await updateEventMutation.mutateAsync({
            id: existingEvent.id,
            data: eventData
          });
        } else {
          // Crear nuevo evento
          await createEventMutation.mutateAsync(eventData);
        }
      }
    };

    if (callups.length > 0 && events.length >= 0) {
      syncCallupsToEvents();
    }
  }, [callups, events]);

  return null; // Componente invisible
}