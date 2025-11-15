import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

export default function Certificates() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allPlayers = await base44.entities.Player.list();
      const userPlayers = allPlayers.filter(p => 
        p.email_padre === currentUser.email || 
        p.email_tutor_2 === currentUser.email
      );
      setMyPlayers(userPlayers);
    };
    fetchUser();
  }, []);

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const generatePDF = async (player, tipo) => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const season = getCurrentSeason();
      const codigo = `CD-${Date.now()}-${player.id.substring(0, 8)}`;
      
      // Header con fondo naranja
      doc.setFillColor(244, 114, 24);
      doc.rect(0, 0, 210, 45, 'F');
      
      // Logo del club (intentar cargar)
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = CLUB_LOGO_URL;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 3000);
        });
        doc.addImage(img, 'PNG', 15, 8, 30, 30);
      } catch (e) {
        console.log("Logo no cargado, continuando sin él");
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.text("CD BUSTARVIEJO", 105, 22, { align: "center" });
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text("Club Deportivo Bustarviejo", 105, 32, { align: "center" });
      doc.setFontSize(10);
      doc.text("Bustarviejo, Madrid", 105, 39, { align: "center" });
      
      // Título del certificado
      doc.setTextColor(244, 114, 24);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text(`CERTIFICADO DE ${tipo.toUpperCase()}`, 105, 65, { align: "center" });
      
      // Línea decorativa
      doc.setDrawColor(244, 114, 24);
      doc.setLineWidth(1);
      doc.line(40, 72, 170, 72);
      
      // Cuerpo
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      let currentY = 90;
      const lineHeight = 8;
      
      doc.text("El Club Deportivo Bustarviejo", 20, currentY);
      currentY += lineHeight;
      doc.text("CERTIFICA QUE:", 20, currentY);
      currentY += lineHeight * 2;
      
      // Nombre del jugador destacado
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(244, 114, 24);
      doc.text(player.nombre, 105, currentY, { align: "center" });
      currentY += lineHeight * 2;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Contenido según tipo
      let mensaje = "";
      let detalles = [];
      
      if (tipo === "Inscripción") {
        mensaje = `Está debidamente inscrito/a en la categoría ${player.deporte} del Club Deportivo Bustarviejo para la temporada ${season}.`;
        detalles.push(`Fecha de inscripción: ${format(new Date(player.created_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      } else if (tipo === "Pagos al Día") {
        const playerPayments = payments.filter(p => p.jugador_id === player.id && p.temporada === season);
        const pendientes = playerPayments.filter(p => p.estado === "Pendiente").length;
        
        if (pendientes > 0) {
          toast.error(`No se puede generar: ${player.nombre} tiene ${pendientes} pago(s) pendiente(s)`);
          setGenerating(false);
          return;
        }
        
        const pagosRealizados = playerPayments.filter(p => p.estado === "Pagado").length;
        const totalPagado = playerPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + p.cantidad, 0);
        
        mensaje = `No tiene pagos pendientes con el Club Deportivo Bustarviejo para la temporada ${season}.`;
        detalles.push(`Pagos realizados: ${pagosRealizados}`);
        detalles.push(`Total pagado: ${totalPagado}€`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      } else if (tipo === "Asistencia") {
        const playerAttendance = attendance.filter(a => 
          a.categoria === player.deporte && 
          a.asistencias.some(att => att.jugador_id === player.id)
        );
        
        let totalSessions = 0;
        let presente = 0;
        
        playerAttendance.forEach(session => {
          const att = session.asistencias.find(a => a.jugador_id === player.id);
          if (att) {
            totalSessions++;
            if (att.estado === "presente") presente++;
          }
        });
        
        const porcentaje = totalSessions > 0 ? Math.round((presente / totalSessions) * 100) : 0;
        
        mensaje = `Ha asistido regularmente a los entrenamientos durante la temporada ${season}, registrando un ${porcentaje}% de asistencia.`;
        detalles.push(`Sesiones totales: ${totalSessions}`);
        detalles.push(`Asistencias: ${presente}`);
        detalles.push(`Porcentaje de asistencia: ${porcentaje}%`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      }
      
      // Mensaje principal
      const splitMsg = doc.splitTextToSize(mensaje, 170);
      doc.text(splitMsg, 20, currentY);
      currentY += (splitMsg.length * lineHeight) + lineHeight;
      
      // Detalles adicionales
      currentY += lineHeight;
      doc.setFontSize(11);
      detalles.forEach(detalle => {
        doc.text(`• ${detalle}`, 25, currentY);
        currentY += lineHeight;
      });
      
      // Texto legal
      currentY += lineHeight * 2;
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      const textoLegal = "Se expide el presente certificado a petición de la persona interesada para los fines que estime oportunos.";
      const splitLegal = doc.splitTextToSize(textoLegal, 170);
      doc.text(splitLegal, 20, currentY);
      
      // Fecha de emisión
      currentY = 230;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Bustarviejo, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 20, currentY);
      
      // Código de verificación
      currentY += lineHeight;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Código de verificación: ${codigo}`, 20, currentY);
      
      // Área de firma con logo del club
      currentY = 245;
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = CLUB_LOGO_URL;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 3000);
        });
        doc.addImage(img, 'PNG', 145, currentY - 15, 25, 25);
      } catch (e) {
        console.log("Logo firma no cargado");
      }
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(130, currentY, 190, currentY);
      currentY += 5;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text("Sello del Club", 160, currentY, { align: "center" });
      
      // Footer
      doc.setFillColor(244, 114, 24);
      doc.rect(0, 282, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("CD BUSTARVIEJO", 105, 289, { align: "center" });
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("CDBUSTARVIEJO@GMAIL.COM | C.D.BUSTARVIEJO@HOTMAIL.ES", 105, 293, { align: "center" });
      
      // Descargar
      doc.save(`Certificado-${tipo}-${player.nombre}-${season}.pdf`);
      toast.success("✅ Certificado generado y descargado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el certificado");
    }
    setGenerating(false);
  };

  const certificateTypes = [
    { 
      id: "Inscripción", 
      icon: FileText, 
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      description: "Certifica la inscripción del jugador"
    },
    { 
      id: "Pagos al Día", 
      icon: CheckCircle2, 
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      description: "Certifica que no hay pagos pendientes"
    },
    { 
      id: "Asistencia", 
      icon: Award, 
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      description: "Certifica el porcentaje de asistencia"
    }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-8 h-8 text-orange-600" />
          Certificados Digitales
        </h1>
        <p className="text-slate-600 mt-1">Genera y descarga certificados oficiales del club en PDF</p>
      </div>

      <div className="space-y-6">
        {myPlayers.length === 0 ? (
          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay jugadores registrados</p>
            </CardContent>
          </Card>
        ) : (
          myPlayers.map(player => (
            <Card key={player.id} className="border-none shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <div className="flex items-center gap-3">
                  {player.foto_url && (
                    <img src={player.foto_url} alt={player.nombre} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" />
                  )}
                  <div>
                    <CardTitle className="text-2xl">{player.nombre}</CardTitle>
                    <p className="text-slate-600 text-sm mt-1">{player.deporte}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {certificateTypes.map(cert => {
                    const Icon = cert.icon;
                    return (
                      <button
                        key={cert.id}
                        onClick={() => generatePDF(player, cert.id)}
                        disabled={generating}
                        className={`relative group ${cert.bgColor} rounded-2xl p-6 border-2 border-transparent hover:border-orange-300 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity" style={{
                          background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                        }}></div>
                        <div className="relative z-10">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cert.color} flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:shadow-xl transition-shadow`}>
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <h3 className="font-bold text-lg text-slate-900 mb-2">{cert.id}</h3>
                          <p className="text-xs text-slate-600">{cert.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {generating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900">Generando certificado...</p>
              <p className="text-sm text-slate-600 mt-1">Por favor espera</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}