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
          "• Accede desde cualquier navegador web o instala la app en tu móvil",
          "• Usa el email y contraseña que recibiste en el correo de bienvenida",
          "• Recomendamos instalar la app en tu móvil para recibir notificaciones"
        ]
      },
      {
        title: "2. Panel Principal",
        content: [
          "• Verás un resumen de tus jugadores y próximos eventos",
          "• Accede rápido a las funciones más usadas desde los botones principales",
          "• Consulta anuncios importantes del club en la parte superior"
        ]
      },
      {
        title: "3. Calendario y Eventos",
        content: [
          "• Ve todos los partidos, entrenamientos y eventos del club",
          "• Exporta el calendario a tu móvil para recibir recordatorios",
          "• Filtra por deporte o categoría de tus hijos"
        ]
      },
      {
        title: "4. Convocatorias",
        content: [
          "• Recibirás notificaciones cuando haya una nueva convocatoria",
          "• Confirma la asistencia de tu hijo con un solo click",
          "• Ve la lista completa de jugadores convocados",
          "• Indica si tu hijo asistirá, no asistirá o tiene dudas"
        ]
      },
      {
        title: "5. Gestión de Pagos",
        content: [
          "• Consulta el estado de tus pagos (pendiente/pagado)",
          "• Sube el justificante de transferencia desde tu móvil",
          "• Recibirás recordatorios automáticos antes de cada cuota",
          "• Revisa el historial completo de pagos"
        ]
      },
      {
        title: "6. Chat con Entrenadores",
        content: [
          "• Comunícate directamente con los entrenadores de tu hijo",
          "• Recibe anuncios importantes del club",
          "• Puedes adjuntar fotos o documentos si es necesario",
          "• Marca mensajes importantes para recordarlos"
        ]
      },
      {
        title: "7. Pedidos de Equipación",
        content: [
          "• Pide la ropa oficial del club para tus hijos",
          "• Elige tallas, artículos y packs disponibles",
          "• Sube el justificante de pago",
          "• Recoge el pedido en las instalaciones del club"
        ]
      },
      {
        title: "8. Datos de tus Jugadores",
        content: [
          "• Mantén actualizados los datos de contacto",
          "• Sube o actualiza la foto de perfil",
          "• Autoriza el uso de imágenes en galería",
          "• Añade información médica relevante si es necesario"
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
  const manual = manuals[userRole] || manuals.padre;
  const Icon = manual.icon;

  const generatePDF = () => {
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