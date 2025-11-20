import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function CalendarExport({ events, callups, schedules, userEmail, userName }) {
  const generateICalEvent = (event) => {
    const startDate = new Date(event.fecha);
    const endDate = event.hora_fin 
      ? new Date(`${event.fecha}T${event.hora_fin}`)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 horas por defecto

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text) => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    let description = escapeText(event.descripcion || '');
    if (event.ubicacion) {
      description += `\\n\\nUbicación: ${escapeText(event.ubicacion)}`;
    }
    if (event.rival) {
      description += `\\n\\nRival: ${escapeText(event.rival)}`;
    }

    return `BEGIN:VEVENT
UID:${event.id}@cdbustarviejo.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeText(event.titulo)}
DESCRIPTION:${description}
LOCATION:${escapeText(event.ubicacion || '')}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`;
  };

  const generateICalCallup = (callup) => {
    const startDate = new Date(`${callup.fecha_partido}T${callup.hora_concentracion || callup.hora_partido}`);
    const endDate = new Date(`${callup.fecha_partido}T${callup.hora_partido}`);
    endDate.setHours(endDate.getHours() + 2);

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text) => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    let description = `Convocatoria: ${escapeText(callup.titulo)}\\n`;
    if (callup.descripcion) {
      description += `\\n${escapeText(callup.descripcion)}`;
    }
    if (callup.rival) {
      description += `\\n\\nRival: ${escapeText(callup.rival)}`;
    }
    description += `\\n\\nHora concentración: ${callup.hora_concentracion || callup.hora_partido}`;
    description += `\\nHora partido: ${callup.hora_partido}`;

    return `BEGIN:VEVENT
UID:callup-${callup.id}@cdbustarviejo.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:⚽ ${escapeText(callup.titulo)}
DESCRIPTION:${description}
LOCATION:${escapeText(callup.ubicacion || '')}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`;
  };

  const generateICalSchedule = (schedule, weekStart) => {
    const dayMap = {
      'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5
    };
    
    const dayOfWeek = dayMap[schedule.dia_semana];
    const startDate = new Date(weekStart);
    startDate.setDate(startDate.getDate() + (dayOfWeek - 1));
    
    const [startHour, startMin] = schedule.hora_inicio.split(':');
    const [endHour, endMin] = schedule.hora_fin.split(':');
    
    startDate.setHours(parseInt(startHour), parseInt(startMin));
    const endDate = new Date(startDate);
    endDate.setHours(parseInt(endHour), parseInt(endMin));

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text) => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    // Repetir semanalmente hasta fin de temporada
    const until = new Date();
    until.setMonth(until.getMonth() + 6);
    const untilStr = until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `BEGIN:VEVENT
UID:schedule-${schedule.id}@cdbustarviejo.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
RRULE:FREQ=WEEKLY;UNTIL=${untilStr}
SUMMARY:🏃 Entrenamiento - ${escapeText(schedule.categoria)}
DESCRIPTION:Entrenamiento semanal\\n${escapeText(schedule.notas || '')}
LOCATION:${escapeText(schedule.ubicacion || '')}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`;
  };

  const exportToICal = () => {
    const icalEvents = events.map(generateICalEvent).join('\n');
    const icalCallups = callups.map(generateICalCallup).join('\n');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const icalSchedules = schedules.map(s => generateICalSchedule(s, weekStart)).join('\n');

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CD Bustarviejo//Calendar//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:CD Bustarviejo - ${userName || userEmail}
X-WR-TIMEZONE:Europe/Madrid
X-WR-CALDESC:Calendario personal de eventos del CD Bustarviejo
${icalEvents}
${icalCallups}
${icalSchedules}
END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cdbustarviejo_calendario_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("📅 Calendario descargado. Impórtalo en Google Calendar o Apple Calendar");
  };

  const exportPersonalEvents = () => {
    const personalEvents = events.filter(e => e.creado_por === userEmail);
    const personalCallups = callups.filter(c => 
      c.jugadores_convocados?.some(j => j.email_padre === userEmail)
    );

    const icalEvents = personalEvents.map(generateICalEvent).join('\n');
    const icalCallups = personalCallups.map(generateICalCallup).join('\n');

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CD Bustarviejo//Personal Calendar//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:CD Bustarviejo - Personal
X-WR-TIMEZONE:Europe/Madrid
${icalEvents}
${icalCallups}
END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cdbustarviejo_personal_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("📅 Eventos personales descargados");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Calendario
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-3 border-b border-slate-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-900 mb-1">¿Para qué sirve?</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            📱 Descarga un archivo .ics para importar todos los eventos, partidos y entrenamientos semanales en Google Calendar, Apple Calendar o Outlook. Recibirás recordatorios automáticos en tu móvil de cada entrenamiento, partido y evento.
          </p>
        </div>
        <DropdownMenuItem onClick={exportToICal} className="cursor-pointer py-3">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <div className="flex-1">
            <div className="font-medium">Exportar Todo</div>
            <div className="text-xs text-slate-500">Eventos, convocatorias y entrenamientos</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPersonalEvents} className="cursor-pointer py-3">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <div className="flex-1">
            <div className="font-medium">Solo Mis Eventos</div>
            <div className="text-xs text-slate-500">Convocatorias y eventos propios</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}