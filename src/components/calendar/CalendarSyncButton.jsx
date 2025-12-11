import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CalendarSyncButton({ event, onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);

  const handleSyncToGoogle = async () => {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke('syncToGoogleCalendar', {
        event_id: event.id
      });

      if (response.data.success) {
        toast.success("✅ Evento sincronizado con Google Calendar");
        if (onSyncComplete) onSyncComplete();
      } else {
        throw new Error(response.data.error || "Error al sincronizar");
      }
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      toast.error("Error al sincronizar con Google Calendar");
    } finally {
      setSyncing(false);
    }
  };

  const downloadICS = () => {
    const icsContent = generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.titulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
    toast.success("📅 Archivo .ics descargado");
  };

  const generateICS = (event) => {
    const formatDate = (date, time = '00:00') => {
      const d = new Date(`${date}T${time}`);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatDate(event.fecha, event.hora || '00:00');
    const endDate = formatDate(event.fecha_fin || event.fecha, event.hora_fin || event.hora || '23:59');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CD Bustarviejo//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@cdbustarviejo.com
DTSTAMP:${formatDate(new Date().toISOString().split('T')[0])}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.titulo}
DESCRIPTION:${event.descripcion || ''}
LOCATION:${event.ubicacion || ''}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Recordatorio: ${event.titulo}
END:VALARM
END:VEVENT
END:VCALENDAR`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {event.synced_to_google && event.google_calendar_link && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(event.google_calendar_link, '_blank')}
          className="gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Ver en Google
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
      
      {!event.synced_to_google && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncToGoogle}
          disabled={syncing}
          className="gap-2"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          Sincronizar con Google
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={downloadICS}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Descargar (.ics)
      </Button>

      {event.synced_to_google && (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Sincronizado
        </Badge>
      )}
    </div>
  );
}