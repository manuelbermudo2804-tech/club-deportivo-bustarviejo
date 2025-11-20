import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, BookOpen, Users, DollarSign, Calendar, MessageCircle } from "lucide-react";
import { jsPDF } from "jspdf";

const manuals = {
  padre: {
    title: "Manual para Familias",
    icon: Users,
    sections: [
      {
        title: "1. Acceso a la Aplicación",
        content: [
          "• Accede desde cualquier navegador: https://tu-app.base44.app",
          "• Recibirás un email de invitación con tu usuario y enlace de acceso",
          "• Crea tu contraseña en el primer acceso",
          "• IMPORTANTE: Instala la app en tu móvil (botón 'Añadir a inicio' en Safari/Chrome) para recibir notificaciones push de convocatorias y mensajes importantes"
        ]
      },
      {
        title: "2. Panel Principal",
        content: [
          "• El panel principal muestra tus jugadores inscritos con foto y datos básicos",
          "• Verás estadísticas: pagos pendientes, convocatorias sin confirmar",
          "• Los botones de acceso rápido están organizados por función (Calendario, Pagos, Chat, etc.)",
          "• Los anuncios urgentes del club aparecen destacados en rojo en la parte superior",
          "• La barra inferior (móvil) o lateral (escritorio) da acceso al menú completo"
        ]
      },
      {
        title: "3. Calendario y Eventos",
        content: [
          "• Calendario → Vista mensual con todos los eventos del club",
          "• VERDE: Entrenamientos semanales | NARANJA: Partidos oficiales | ROJO: Eventos importantes",
          "• Click en cualquier evento para ver detalles (hora, ubicación, rival)",
          "• Botón 'Exportar Calendario' → Descarga archivo .ics → Impórtalo en Google Calendar o Apple Calendar",
          "• Una vez importado, tu móvil te avisará automáticamente 1 hora antes de cada partido"
        ]
      },
      {
        title: "4. Convocatorias",
        content: [
          "• Convocatorias → Lista de partidos para los que tu hijo está convocado",
          "• BADGE NARANJA: Indica cuántas convocatorias tienen confirmación pendiente",
          "• Recibirás una notificación push en tu móvil cuando tu hijo sea convocado",
          "• Click en la convocatoria → Verás: rival, hora concentración, hora partido, ubicación (con mapa)",
          "• BOTÓN CONFIRMAR: Elige 'Asistiré' (verde), 'No asistiré' (rojo) o 'Duda' (amarillo)",
          "• Una vez confirmado, el entrenador verá tu respuesta en tiempo real",
          "• Puedes cambiar tu confirmación hasta 2 horas antes del partido"
        ]
      },
      {
        title: "5. Gestión de Pagos",
        content: [
          "• Pagos → Lista de cuotas por jugador: Junio (inscripción), Septiembre, Diciembre",
          "• ESTADOS: Pendiente (naranja), En revisión (azul), Pagado (verde)",
          "• PROCESO: 1) Haz la transferencia al banco del club, 2) Sube foto del justificante, 3) Espera confirmación del tesorero",
          "• Datos bancarios: IBAN ES12 XXXX XXXX XX XXXXXXXXXX | Concepto: Nombre Jugador + Mes",
          "• Recibirás recordatorios automáticos: 15 días antes, 7 días antes, 3 días antes, 1 día después si no has pagado",
          "• El administrador reconcilia pagos con extractos bancarios y confirma",
          "• Histórico: Consulta todos los pagos de temporadas anteriores"
        ]
      },
      {
        title: "6. Chat con Entrenadores",
        content: [
          "• Chat → Comunicación por categoría (ej: 'Chat Fútbol Alevín')",
          "• MENSAJES DEL CLUB: Aparecen con fondo azul/verde → Son de entrenadores o administradores",
          "• TUS MENSAJES: Fondo gris → El entrenador los verá en su panel",
          "• Adjuntar archivos: Click en 📎 → Sube fotos (lesiones, justificantes) o documentos",
          "• PRIORIDAD URGENTE: Los mensajes marcados como urgentes aparecen con notificación roja",
          "• El chat NO es para emergencias → Usa el teléfono del entrenador en casos urgentes (está en su perfil)",
          "• Los mensajes antiguos (>6 meses) se archivan automáticamente"
        ]
      },
      {
        title: "7. Pedidos de Equipación",
        content: [
          "• Tienda de Ropa → ABIERTA SOLO EN JUNIO Y JULIO (inscripciones)",
          "• ARTÍCULOS: Chaqueta partidos (35€), Pack entrenamiento completo (41€), Chubasquero (20€), Anorak (40€), Mochila (22€)",
          "• TALLAS: Desde 6XS (4-5 años) hasta 3XL adultos → Consulta la guía de tallas en la app",
          "• PROCESO: 1) Haz tu pedido seleccionando artículos y tallas, 2) Transferencia bancaria, 3) Sube justificante, 4) Recogida en septiembre",
          "• Los pedidos se entregan en la primera semana de SEPTIEMBRE en las instalaciones del club",
          "• Pedidos grupales: Si varios padres piden juntos, pueden ahorrar en envío"
        ]
      },
      {
        title: "8. Datos de tus Jugadores",
        content: [
          "• Mis Jugadores → Lista de tus hijos inscritos en el club",
          "• Click en un jugador → Editar: nombre, fecha nacimiento, categoría, foto, teléfonos, emails tutores",
          "• EMAILS: Email padre (acceso principal) + Email tutor 2 (recibe notificaciones) + Email jugador (opcional, para mayores de 14 años con autorización)",
          "• AUTORIZACIÓN IMÁGENES: Marca SI o NO para permitir fotos en redes sociales y galería del club",
          "• Información médica: Alergias, lesiones crónicas, medicación → Visible solo para entrenador y coordinador",
          "• Actualiza datos de contacto si cambias de móvil o email"
        ]
      }
    ]
  },
  entrenador: {
    title: "Manual para Entrenadores",
    icon: BookOpen,
    sections: [
      {
        title: "1. Tu Plantilla",
        content: [
          "• Accede a la lista completa de jugadores de tu equipo",
          "• Ve datos de contacto de padres/tutores",
          "• Consulta historial deportivo y evaluaciones previas",
          "• Filtra y busca jugadores rápidamente"
        ]
      },
      {
        title: "2. Asistencia",
        content: [
          "• Pasa lista en cada entrenamiento de forma digital",
          "• Marca presente, ausente, justificado o tardanza",
          "• Añade observaciones específicas por sesión",
          "• Consulta estadísticas de asistencia por jugador"
        ]
      },
      {
        title: "3. Evaluaciones",
        content: [
          "• Evalúa aspectos técnicos, tácticos, físicos y actitudinales",
          "• Puntúa del 1 al 5 en cada área",
          "• Añade observaciones, fortalezas y aspectos a mejorar",
          "• Comparte evaluaciones con las familias si lo deseas"
        ]
      },
      {
        title: "4. Convocatorias",
        content: [
          "• Crea convocatorias para partidos oficiales",
          "• Selecciona jugadores y añade detalles del partido",
          "• Envía automáticamente notificaciones a las familias",
          "• Recibe confirmaciones de asistencia en tiempo real",
          "• Ve quién asistirá, no asistirá o tiene dudas"
        ]
      },
      {
        title: "5. Comunicación",
        content: [
          "• Chat de equipo para mensajes a todas las familias",
          "• Mensajes privados a familias específicas",
          "• Envía anuncios importantes con prioridad",
          "• Adjunta archivos, fotos o documentos"
        ]
      },
      {
        title: "6. Horarios",
        content: [
          "• Configura los horarios semanales de entrenamiento",
          "• Indica día, hora y ubicación",
          "• Los horarios se sincronizan automáticamente con el calendario",
          "• Las familias verán los horarios en su panel"
        ]
      }
    ]
  },
  coordinador: {
    title: "Manual para Coordinadores",
    icon: BookOpen,
    sections: [
      {
        title: "1. Supervisión General",
        content: [
          "• Vista global de todos los equipos del club",
          "• Acceso a plantillas de todas las categorías",
          "• Consulta estadísticas consolidadas",
          "• Panel de control centralizado"
        ]
      },
      {
        title: "2. Reportes de Entrenadores",
        content: [
          "• Consulta reportes de asistencia por categoría",
          "• Revisa evaluaciones de todos los jugadores",
          "• Identifica tendencias y áreas de mejora",
          "• Exporta reportes a PDF o CSV"
        ]
      },
      {
        title: "3. Coordinación de Entrenadores",
        content: [
          "• Comunícate con todos los entrenadores",
          "• Establece directrices técnicas",
          "• Resuelve dudas y apoya su trabajo",
          "• Organiza reuniones técnicas"
        ]
      },
      {
        title: "4. Calendario Maestro",
        content: [
          "• Vista completa de todos los eventos del club",
          "• Evita solapamientos de horarios",
          "• Planifica la temporada estratégicamente",
          "• Coordina uso de instalaciones"
        ]
      },
      {
        title: "5. Gestión de Calidad",
        content: [
          "• Supervisa la calidad del entrenamiento",
          "• Verifica que se cumplan los objetivos técnicos",
          "• Asegura el registro correcto de asistencia",
          "• Garantiza evaluaciones completas"
        ]
      }
    ]
  },
  admin: {
    title: "Manual de Administración",
    icon: BookOpen,
    sections: [
      {
        title: "1. Gestión de Usuarios",
        content: [
          "• Invita nuevas familias y entrenadores por email",
          "• Asigna roles: admin, entrenador, coordinador, padre",
          "• Gestiona permisos y accesos",
          "• Activa/desactiva usuarios si es necesario"
        ]
      },
      {
        title: "2. Inscripción de Jugadores",
        content: [
          "• Registra nuevos jugadores manualmente",
          "• Verifica datos de inscripción de las familias",
          "• Asigna jugadores a categorías correctas",
          "• Gestiona renovaciones de temporada"
        ]
      },
      {
        title: "3. Control de Pagos",
        content: [
          "• Revisa justificantes subidos por familias",
          "• Marca pagos como confirmados",
          "• Envía recordatorios manuales o automáticos",
          "• Reconcilia con extractos bancarios",
          "• Exporta reportes financieros"
        ]
      },
      {
        title: "4. Gestión de Temporadas",
        content: [
          "• Configura cuotas para la temporada",
          "• Define fechas de inicio y fin",
          "• Ejecuta reinicio de temporada al final del año",
          "• Archiva datos históricos",
          "• Marca jugadores para renovación"
        ]
      },
      {
        title: "5. Calendario y Eventos",
        content: [
          "• Crea partidos, entrenamientos y eventos",
          "• Publica eventos para todas las categorías",
          "• Marca eventos importantes con colores",
          "• Genera notificaciones automáticas"
        ]
      },
      {
        title: "6. Comunicación Masiva",
        content: [
          "• Envía anuncios a todas las familias",
          "• Segmenta por categoría o deporte",
          "• Usa prioridades: normal, importante, urgente",
          "• Programa anuncios con fecha de expiración"
        ]
      },
      {
        title: "7. Pedidos y Tienda",
        content: [
          "• Gestiona pedidos de equipación",
          "• Abre/cierra la tienda según temporada",
          "• Marca pedidos como entregados",
          "• Genera reportes de pedidos por categoría"
        ]
      },
      {
        title: "8. Estadísticas y Reportes",
        content: [
          "• Consulta dashboard con métricas clave",
          "• Exporta datos a CSV/PDF",
          "• Genera reportes personalizados",
          "• Analiza tendencias del club"
        ]
      }
    ]
  }
};

export default function ManualGenerator({ userRole }) {
  const [isVisible, setIsVisible] = React.useState(() => {
    return !localStorage.getItem('manualDownloaded');
  });

  const manual = manuals[userRole] || manuals.padre;
  const Icon = manual.icon;

  if (!isVisible) return null;

  const generatePDF = () => {
    localStorage.setItem('manualDownloaded', 'true');
    setIsVisible(false);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 30;

    // Header
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(manual.title, margin, 25);

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('CD Bustarviejo - Guía de Usuario', margin, 35);

    yPosition = 60;

    // Sections
    doc.setTextColor(0, 0, 0);
    manual.sections.forEach((section, sectionIndex) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Section Title
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(234, 88, 12);
      doc.text(section.title, margin, yPosition);
      yPosition += 10;

      // Section Content
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(50, 50, 50);
      
      section.content.forEach((item) => {
        const lines = doc.splitTextToSize(item, pageWidth - 2 * margin);
        lines.forEach((line) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin + 5, yPosition);
          yPosition += 6;
        });
      });

      yPosition += 8;
    });

    // Footer on last page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} - CD Bustarviejo © 2025`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(`Manual_${userRole}_CD_Bustarviejo.pdf`);
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-orange-900">
          <Icon className="w-6 h-6" />
          {manual.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-700">
          📖 Descarga el manual completo en PDF con todas las instrucciones para usar la aplicación.
        </p>

        <div className="bg-white rounded-lg p-4 space-y-2">
          <p className="font-semibold text-slate-900">Contenido del manual:</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {manual.sections.map((section, index) => (
              <li key={index}>• {section.title}</li>
            ))}
          </ul>
        </div>

        <Button
          onClick={generatePDF}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:opacity-90 text-white font-semibold"
        >
          <Download className="w-5 h-5 mr-2" />
          Descargar Manual en PDF
        </Button>

        <p className="text-xs text-slate-500 text-center">
          El manual incluye capturas de pantalla y guías paso a paso
        </p>
      </CardContent>
    </Card>
  );
}