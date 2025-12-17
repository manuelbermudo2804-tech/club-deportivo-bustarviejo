import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Users, CreditCard, UserPlus, MessageCircle, Bell, FileSignature, Calendar, Phone, Mail, Home } from "lucide-react";
import { jsPDF } from "jspdf";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function FamilyGuide() {
  const sections = [
    {
      icon: Users,
      color: "bg-orange-600",
      title: "1. Registrar Jugadores",
      steps: [
        'Ve a "👥 Mis Jugadores" en el menú lateral',
        'Pulsa el botón "➕ Registrar Nuevo Jugador"',
        'Rellena todos los datos del formulario (foto tipo carnet OBLIGATORIA)',
        'Sube documentos: DNI jugador (si >14 años), DNI tutor, libro familia',
        'Elige tipo de pago: cuota única o fraccionada en 3 meses',
        'Sube el justificante de pago una vez realizada la transferencia',
        '¡Listo! El club revisará y confirmará la inscripción'
      ]
    },
    {
      icon: CreditCard,
      color: "bg-green-600",
      title: "2. Gestión de Pagos",
      steps: [
        'Accede a "💳 Pagos" en el menú lateral',
        'Verás todos los pagos pendientes y realizados de tus jugadores',
        'Para pagar: pulsa "💰 Pagar" en el pago pendiente',
        'Realiza la transferencia bancaria con el concepto indicado',
        'Sube el justificante de pago (captura de pantalla)',
        'El club validará el pago y cambiará el estado a "Pagado"',
        'Recibirás un recibo automático por email'
      ]
    },
    {
      icon: UserPlus,
      color: "bg-purple-600",
      title: "3. Segundo Progenitor",
      steps: [
        'Ve a "👥 Mis Jugadores" y selecciona un jugador',
        'En la sección "Segundo Progenitor/Tutor" pulsa "📧 Enviar Invitación"',
        'El segundo progenitor recibirá un email con un enlace',
        'Al hacer clic, se registrará automáticamente y verá a los jugadores',
        'Ambos progenitores tendréis acceso completo a la información',
        'Cada uno recibirá notificaciones independientes'
      ]
    },
    {
      icon: MessageCircle,
      color: "bg-blue-600",
      title: "4. Chat y Comunicación",
      steps: [
        '"💬 Chat Coordinador": para dudas generales del club',
        '"⚽ Chat Entrenador": comunicación directa con el entrenador de tu hijo',
        '"🤖 Asistente Virtual": resuelve dudas automáticas 24/7',
        'Puedes enviar texto, fotos, audios y archivos',
        'Recibirás notificaciones push de respuestas importantes',
        'Los entrenadores responden en horario establecido'
      ]
    },
    {
      icon: Bell,
      color: "bg-orange-600",
      title: "5. Convocatorias",
      steps: [
        'Recibirás notificaciones cuando tu hijo sea convocado',
        'Ve a "🏆 Convocatorias" para ver todos los partidos',
        'Debes CONFIRMAR asistencia: "Asistiré", "No asistiré" o "Duda"',
        'Indica la hora y lugar de concentración',
        'El entrenador necesita tu confirmación para planificar',
        'Puedes cambiar tu respuesta hasta 24h antes del partido'
      ]
    },
    {
      icon: FileSignature,
      color: "bg-red-600",
      title: "6. Firmas Federación",
      steps: [
        'Recibirás una alerta cuando haya documentos pendientes',
        'Ve a "🖊️ Firmas Federación" en el menú',
        'Encontrarás enlaces para firmar online con la federación',
        'Si tu hijo es menor de 18, TÚ también debes firmar',
        'Pulsa "Abrir enlace" para cada documento',
        'Marca como completado cuando termines cada firma',
        'Necesario para que tu hijo pueda jugar partidos oficiales'
      ]
    },
    {
      icon: Calendar,
      color: "bg-indigo-600",
      title: "7. Calendario y Eventos",
      steps: [
        '"📅 Calendario y Horarios": horarios de entrenamientos',
        '"🎉 Eventos Club": fiestas, comidas, torneos especiales',
        'Confirma asistencia a eventos si lo requieren',
        'Consulta ubicación y hora de cada actividad',
        'Añade eventos al calendario de tu móvil'
      ]
    },
    {
      icon: Home,
      color: "bg-green-600",
      title: "8. Otras Funciones",
      steps: [
        '"📢 Anuncios": información importante del club',
        '"📄 Documentos": descarga reglamentos, protocolos, autorizaciones',
        '"🛍️ Pedidos Ropa": chaquetas, packs de entrenamiento',
        '"🍀 Lotería Navidad": participa en la lotería del club',
        '"🖼️ Galería": fotos de partidos y eventos',
        '"🎫 Hacerse Socio": conviértete en socio del club'
      ]
    }
  ];

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('CD BUSTARVIEJO', 105, 15, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Guía Rápida para Familias', 105, 25, { align: 'center' });

    y = 45;
    doc.setTextColor(0, 0, 0);

    sections.forEach((section, idx) => {
      if (idx > 0 && idx % 2 === 0) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(249, 115, 22);
      doc.text(section.title, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      section.steps.forEach((step, stepIdx) => {
        const lines = doc.splitTextToSize(`${stepIdx + 1}. ${step}`, 170);
        lines.forEach(line => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 25, y);
          y += 5;
        });
        y += 2;
      });
      y += 8;
    });

    // Footer
    doc.addPage();
    doc.setFillColor(34, 197, 106);
    doc.rect(0, 260, 210, 37, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('📧 Contacto', 105, 270, { align: 'center' });
    doc.setFontSize(10);
    doc.text('CDBUSTARVIEJO@GMAIL.COM', 105, 278, { align: 'center' });
    doc.text('C.D.BUSTARVIEJO@HOTMAIL.ES', 105, 285, { align: 'center' });

    doc.save('Guia_Familias_CD_Bustarviejo.pdf');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">📖 Guía para Familias</h1>
              <p className="text-orange-100 text-lg">CD Bustarviejo - Todo lo que necesitas saber</p>
            </div>
            <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-24 h-24 rounded-2xl shadow-xl hidden lg:block" />
          </div>
          
          <div className="mt-6 flex gap-3">
            <Button 
              onClick={downloadPDF}
              className="bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Descargar PDF
            </Button>
            <Link to={createPageUrl("Home")}>
              <Button variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                <Home className="w-5 h-5 mr-2" />
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bienvenida */}
      <div className="max-w-5xl mx-auto mb-8">
        <Card className="border-2 border-orange-300 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-orange-600 mb-4">¡Bienvenidos al CD Bustarviejo! 🎉</h2>
              <p className="text-slate-700 leading-relaxed">
                Esta guía te ayudará a sacar el máximo partido de nuestra aplicación.
                Aquí encontrarás paso a paso cómo realizar las gestiones más importantes
                para que tus hijos disfruten del deporte en nuestro club.
              </p>
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                <p className="text-green-800 font-medium">
                  💡 <strong>Consejo:</strong> Descarga esta guía en PDF y tenla siempre a mano en tu móvil
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secciones principales */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 mb-8">
        {sections.map((section, idx) => (
          <Card key={idx} className="border-2 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`${section.color} p-3 rounded-xl`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
              </div>
              <div className="space-y-2">
                {section.steps.map((step, stepIdx) => (
                  <div key={stepIdx} className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold min-w-[20px]">{stepIdx + 1}.</span>
                    <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer de contacto */}
      <div className="max-w-5xl mx-auto">
        <Card className="bg-gradient-to-r from-green-600 to-green-700 border-none shadow-2xl">
          <CardContent className="p-8 text-white">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">📞 ¿Necesitas Ayuda?</h3>
              <p className="mb-6 text-green-100">
                Si tienes dudas, estamos aquí para ayudarte
              </p>
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-xl">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:CDBUSTARVIEJO@GMAIL.COM" className="font-medium">
                    CDBUSTARVIEJO@GMAIL.COM
                  </a>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-xl">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES" className="font-medium">
                    C.D.BUSTARVIEJO@HOTMAIL.ES
                  </a>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white/10 rounded-xl">
                <p className="text-sm text-green-100">
                  💬 También puedes usar el <strong>Chat Coordinador</strong> desde la app para consultas rápidas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nota final */}
      <div className="max-w-5xl mx-auto mt-8 text-center">
        <p className="text-sm text-slate-500">
          CD Bustarviejo © {new Date().getFullYear()} - Guía actualizada para familias
        </p>
      </div>
    </div>
  );
}