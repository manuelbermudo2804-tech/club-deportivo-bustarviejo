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

export default function CalendarExport({ events, callups, schedules, matches = [], userEmail, userName }) {
  const escapeText = (text) => String(text || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  const stamp = () => new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const localStr = (fecha, hora) => `${String(fecha).replace(/-/g, '')}T${String(hora).replace(':', '')}00`;
  const plusHours = (fecha, hora, h) => {
    const [hh, mm] = String(hora).split(':').map(n => parseInt(n, 10));
    const d = new Date(`${fecha}T00:00:00`);
    d.setHours(hh + h, mm || 0, 0, 0);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  };
  const nextDay = (fecha) => {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  };

  // Partidos de liga (federación). Si no tienen hora, se exportan como evento de día completo
  // para que aparezcan igualmente en Google/Apple.
  const generateICalMatch = (m) => {
    const fecha = m.fecha_iso || m.date;
    if (!fecha) return '';
    const isLocal = String(m.local || m.local_visitante || '').toLowerCase().includes('bustarviejo') || m.local_visitante === 'Local';
    const rival = m.rival || (isLocal ? m.visitante : m.local) || '';
    const hora = m.hora || m.hora_partido;
    const timing = hora
      ? [`DTSTART;TZID=Europe/Madrid:${localStr(fecha, hora)}`, `DTEND;TZID=Europe/Madrid:${plusHours(fecha, hora, 2)}`]
      : [`DTSTART;VALUE=DATE:${String(fecha).replace(/-/g, '')}`, `DTEND;VALUE=DATE:${nextDay(fecha)}`];

    return [
      'BEGIN:VEVENT',
      `UID:partido-${m.id}@cdbustarviejo.com`,
      `DTSTAMP:${stamp()}`,
      ...timing,
      `SUMMARY:⚽ ${escapeText(m.categoria || m.category)}${rival ? ` vs ${escapeText(rival)}` : ''}`,
      `DESCRIPTION:${escapeText(`Jornada ${m.jornada || '-'} · ${isLocal ? 'Local' : 'Visitante'}${hora ? '' : ' · Hora por confirmar'}`)}`,
      `LOCATION:${escapeText(m.campo || m.ubicacion || '')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\n');
  };

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
    const icalCallups = callups.filter(c => c.fecha_partido && (c.hora_partido || c.hora_concentracion)).map(generateICalCallup).join('\n');
    const icalMatches = matches.map(generateICalMatch).filter(Boolean).join('\n');

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
${icalMatches}
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
            📱 Descarga un archivo .ics para importar partidos y eventos importantes en Google Calendar, Apple Calendar o Outlook. Recibirás recordatorios automáticos en tu móvil.
          </p>
        </div>
        <DropdownMenuItem onClick={exportToICal} className="cursor-pointer py-3">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <div className="flex-1">
            <div className="font-medium">Exportar Todo</div>
            <div className="text-xs text-slate-500">Eventos, convocatorias y partidos de liga</div>
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