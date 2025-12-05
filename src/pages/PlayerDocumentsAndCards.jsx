import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, FileText, CheckCircle2, Loader2, CreditCard, Download, User as UserIcon, Mail, Trophy, History, Phone, MapPin, AlertCircle, RotateCcw, Send, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "qrcode";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // Desde junio ya empieza la siguiente temporada (inscripciones)
  if (currentMonth >= 6) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

// Función para normalizar temporada (acepta formatos como "2025/2026" o "2025-2026")
const normalizeSeasonFormat = (season) => {
  if (!season) return "";
  return season.replace("-", "/");
};

export default function PlayerDocumentsAndCards() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [emailDialog, setEmailDialog] = useState({ open: false, player: null, tipo: null });
  const [emailDestino, setEmailDestino] = useState("");
  const [torneoDialog, setTorneoDialog] = useState({ open: false, player: null });
  const [torneoData, setTorneoData] = useState({ nombre: "", fecha: "", posicion: "" });
  const [historyDialog, setHistoryDialog] = useState({ open: false, player: null });
  const cardRefs = useRef({});
  const qrRefs = useRef({});
  const season = getCurrentSeason();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const allPlayers = await base44.entities.Player.list();
      const userPlayers = allPlayers.filter(p => 
        p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email
      );
      setMyPlayers(userPlayers);
    };
    fetchUser();
  }, []);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list('-created_date'),
  });

  // Generar QR codes para cada jugador
  useEffect(() => {
    myPlayers.forEach(async (player) => {
      const qrData = JSON.stringify({
        club: "CD Bustarviejo",
        jugador: player.nombre,
        categoria: player.deporte,
        temporada: season,
        id: player.id.substring(0, 12),
        validez: season
      });
      try {
        const qrDataUrl = await QRCode.toDataURL(qrData, { width: 80, margin: 1 });
        qrRefs.current[player.id] = qrDataUrl;
      } catch (err) {
        console.error("Error generating QR:", err);
      }
    });
  }, [myPlayers, season]);

  const saveCertificateMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certificates'] }),
  });

  const generatePDF = async (player, tipo, sendEmail = false, emailTo = null, torneoInfo = null) => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const codigo = `CD-${Date.now()}-${player.id.substring(0, 8)}`;
      
      doc.setFillColor(244, 114, 24);
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.text("CD BUSTARVIEJO", 105, 22, { align: "center" });
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text("Club Deportivo Bustarviejo", 105, 32, { align: "center" });
      doc.setFontSize(10);
      doc.text("Bustarviejo, Madrid", 105, 39, { align: "center" });
      
      doc.setTextColor(244, 114, 24);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text(`CERTIFICADO DE ${tipo.toUpperCase()}`, 105, 65, { align: "center" });
      
      doc.setDrawColor(244, 114, 24);
      doc.setLineWidth(1);
      doc.line(40, 72, 170, 72);
      
      // Añadir foto del jugador si existe
      let currentY = 90;
      if (player.foto_url) {
        try {
          // Crear imagen desde URL
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = player.foto_url;
          });
          
          // Dibujar foto circular (simulada con recuadro redondeado)
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          ctx.beginPath();
          ctx.arc(50, 50, 50, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, 100, 100);
          
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 20, 78, 25, 25);
          
          // Borde naranja alrededor de la foto
          doc.setDrawColor(244, 114, 24);
          doc.setLineWidth(1.5);
          doc.circle(32.5, 90.5, 13, 'S');
        } catch (imgError) {
          console.log("No se pudo cargar la foto del jugador:", imgError);
        }
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      const lineHeight = 8;
      
      doc.text("El Club Deportivo Bustarviejo", 20, currentY);
      currentY += lineHeight;
      doc.text("CERTIFICA QUE:", 20, currentY);
      currentY += lineHeight * 2;
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(244, 114, 24);
      doc.text(player.nombre, 105, currentY, { align: "center" });
      currentY += lineHeight * 2;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      let mensaje = "";
      let detalles = [];
      
      if (tipo === "Inscripción") {
        mensaje = `Está debidamente inscrito/a en la categoría ${player.deporte} del Club Deportivo Bustarviejo para la temporada ${season}.`;
        detalles.push(`Fecha de inscripción: ${format(new Date(player.created_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      } else if (tipo === "Participación en Torneo") {
        if (!torneoInfo?.nombre) {
          toast.error("Debes especificar los datos del torneo");
          setGenerating(false);
          return;
        }
        mensaje = `Ha participado en el torneo "${torneoInfo.nombre}" representando al Club Deportivo Bustarviejo.`;
        detalles.push(`Torneo: ${torneoInfo.nombre}`);
        if (torneoInfo.fecha) detalles.push(`Fecha: ${format(new Date(torneoInfo.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}`);
        if (torneoInfo.posicion) detalles.push(`Posición obtenida: ${torneoInfo.posicion}`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      } else if (tipo === "Pagos al Día") {
        // Buscar pagos del jugador en la temporada actual (normalizando formato)
        const playerPayments = payments.filter(p => 
          p.jugador_id === player.id && 
          normalizeSeasonFormat(p.temporada) === normalizeSeasonFormat(season)
        );
        
        console.log(`[Certificado Pagos] Jugador: ${player.nombre}, Temporada: ${season}`);
        console.log(`[Certificado Pagos] Pagos encontrados:`, playerPayments);
        
        const pendientes = playerPayments.filter(p => p.estado === "Pendiente" || p.estado === "En revisión").length;
        if (pendientes > 0) {
          toast.error(`No se puede generar: ${player.nombre} tiene ${pendientes} pago(s) pendiente(s)`);
          setGenerating(false);
          return;
        }
        const pagosPagados = playerPayments.filter(p => p.estado === "Pagado");
        const pagosRealizados = pagosPagados.length;
        const totalPagado = pagosPagados.reduce((sum, p) => sum + (p.cantidad || 0), 0);
        
        if (pagosRealizados === 0) {
          toast.error(`No se puede generar: ${player.nombre} no tiene pagos registrados en la temporada ${season}`);
          setGenerating(false);
          return;
        }
        
        mensaje = `No tiene pagos pendientes con el Club Deportivo Bustarviejo para la temporada ${season}.`;
        detalles.push(`Pagos realizados: ${pagosRealizados}`);
        detalles.push(`Total pagado: ${totalPagado}€`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      } else if (tipo === "Asistencia") {
        const playerAttendance = attendance.filter(a => 
          a.categoria === player.deporte && a.asistencias?.some(att => att.jugador_id === player.id)
        );
        let totalSessions = 0, presente = 0;
        playerAttendance.forEach(session => {
          const att = session.asistencias?.find(a => a.jugador_id === player.id);
          if (att) { totalSessions++; if (att.estado === "presente") presente++; }
        });
        const porcentaje = totalSessions > 0 ? Math.round((presente / totalSessions) * 100) : 0;
        mensaje = `Ha asistido regularmente a los entrenamientos durante la temporada ${season}, registrando un ${porcentaje}% de asistencia.`;
        detalles.push(`Sesiones totales: ${totalSessions}`);
        detalles.push(`Asistencias: ${presente}`);
        detalles.push(`Porcentaje de asistencia: ${porcentaje}%`);
        detalles.push(`Categoría: ${player.deporte}`);
        detalles.push(`Temporada: ${season}`);
      }
      
      const splitMsg = doc.splitTextToSize(mensaje, 170);
      doc.text(splitMsg, 20, currentY);
      currentY += (splitMsg.length * lineHeight) + lineHeight * 2;
      
      doc.setFontSize(11);
      detalles.forEach(detalle => { doc.text(`• ${detalle}`, 25, currentY); currentY += lineHeight; });
      
      currentY += lineHeight * 2;
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      const textoLegal = "Se expide el presente certificado a petición de la persona interesada para los fines que estime oportunos.";
      doc.text(doc.splitTextToSize(textoLegal, 170), 20, currentY);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Bustarviejo, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 20, 230);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Código de verificación: ${codigo}`, 20, 238);
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(130, 245, 190, 245);
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text("Sello del Club", 160, 250, { align: "center" });
      
      doc.setFillColor(244, 114, 24);
      doc.rect(0, 282, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("CD BUSTARVIEJO", 105, 289, { align: "center" });
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("CDBUSTARVIEJO@GMAIL.COM", 105, 293, { align: "center" });
      
      // Guardar en historial
      const certificateData = {
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        tipo_certificado: tipo,
        temporada: season,
        categoria: player.deporte,
        fecha_emision: new Date().toISOString(),
        codigo_verificacion: codigo,
        datos_certificado: { detalles },
        solicitado_por: user?.email,
        enviado_por_email: sendEmail,
        email_destino: emailTo || null,
        nombre_torneo: torneoInfo?.nombre || null,
        fecha_torneo: torneoInfo?.fecha || null,
        posicion_torneo: torneoInfo?.posicion || null
      };
      
      saveCertificateMutation.mutate(certificateData);

      if (sendEmail && emailTo) {
        // Enviar por email
        const pdfBase64 = doc.output('datauristring');
        try {
          await base44.integrations.Core.SendEmail({
            to: emailTo,
            subject: `Certificado de ${tipo} - ${player.nombre} - CD Bustarviejo`,
            body: `
Estimado/a,

Adjunto encontrará el certificado de ${tipo} solicitado para ${player.nombre}.

Datos del certificado:
- Tipo: ${tipo}
- Jugador: ${player.nombre}
- Categoría: ${player.deporte}
- Temporada: ${season}
- Código de verificación: ${codigo}

Este certificado ha sido emitido digitalmente por el Club Deportivo Bustarviejo.

Un saludo,
CD Bustarviejo
CDBUSTARVIEJO@GMAIL.COM
            `.trim()
          });
          toast.success(`✅ Certificado enviado a ${emailTo}`);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          toast.error("El certificado se generó pero falló el envío por email");
        }
      }

      doc.save(`Certificado-${tipo}-${player.nombre}-${season}.pdf`);
      toast.success("✅ Certificado generado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el certificado");
    }
    setGenerating(false);
  };

  const handleEmailCertificate = () => {
    if (!emailDestino) {
      toast.error("Introduce un email válido");
      return;
    }
    generatePDF(emailDialog.player, emailDialog.tipo, true, emailDestino);
    setEmailDialog({ open: false, player: null, tipo: null });
    setEmailDestino("");
  };

  const handleTorneoCertificate = () => {
    if (!torneoData.nombre) {
      toast.error("El nombre del torneo es obligatorio");
      return;
    }
    generatePDF(torneoDialog.player, "Participación en Torneo", false, null, torneoData);
    setTorneoDialog({ open: false, player: null });
    setTorneoData({ nombre: "", fecha: "", posicion: "" });
  };

  const getPlayerCertificates = (playerId) => {
    return certificates.filter(c => c.jugador_id === playerId);
  };

  const downloadCard = async (player) => {
    setGenerating(true);
    const card = cardRefs.current[player.id];
    if (!card) { toast.error("Error: Carnet no encontrado"); setGenerating(false); return; }
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `carnet_frontal_${player.nombre.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success("✅ Carnet frontal descargado");
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error("Error al descargar el carnet");
    }
    setGenerating(false);
  };

  const downloadCardBack = async (player) => {
    setGenerating(true);
    const card = cardRefs.current[`${player.id}_back`];
    if (!card) { toast.error("Error: Trasera no encontrada"); setGenerating(false); return; }
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `carnet_trasera_${player.nombre.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success("✅ Trasera del carnet descargada");
    } catch (error) {
      console.error('Error downloading card back:', error);
      toast.error("Error al descargar la trasera");
    }
    setGenerating(false);
  };

  // Descarga combinada: frontal + trasera en un solo PDF
  const downloadCardPDF = async (player) => {
    setGenerating(true);
    const cardFront = cardRefs.current[player.id];
    const cardBack = cardRefs.current[`${player.id}_back`];
    
    if (!cardFront || !cardBack) { 
      toast.error("Error: Carnet no encontrado"); 
      setGenerating(false); 
      return; 
    }
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Capturar frontal
      const canvasFront = await html2canvas(cardFront, { backgroundColor: '#ffffff', scale: 2 });
      // Capturar trasera
      const canvasBack = await html2canvas(cardBack, { backgroundColor: '#ffffff', scale: 2 });
      
      // Crear PDF con tamaño de tarjeta de crédito (85.6mm x 53.98mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98]
      });
      
      // Añadir frontal
      const imgFront = canvasFront.toDataURL('image/png');
      pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98);
      
      // Nueva página para la trasera
      pdf.addPage([85.6, 53.98], 'landscape');
      const imgBack = canvasBack.toDataURL('image/png');
      pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98);
      
      pdf.save(`carnet_completo_${player.nombre.replace(/\s+/g, '_')}.pdf`);
      toast.success("✅ Carnet completo descargado (frontal + trasera)");
    } catch (error) {
      console.error('Error downloading card PDF:', error);
      toast.error("Error al generar el PDF");
    }
    setGenerating(false);
  };

  const certificateTypes = [
    { id: "Inscripción", icon: FileText, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50", description: "Certifica la inscripción del jugador" },
    { id: "Pagos al Día", icon: CheckCircle2, color: "from-green-500 to-green-600", bgColor: "bg-green-50", description: "Certifica que no hay pagos pendientes" },
    { id: "Asistencia", icon: Award, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50", description: "Certifica el porcentaje de asistencia" },
    { id: "Participación en Torneo", icon: Trophy, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-50", description: "Certifica participación en torneo", special: true }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-8 h-8 text-orange-600" />
          Certificados y Carnets
        </h1>
        <p className="text-slate-600 mt-1">Genera certificados oficiales o carnets digitales de tus jugadores</p>
      </div>

      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="certificates">📜 Certificados</TabsTrigger>
          <TabsTrigger value="cards">🆔 Carnets Digitales</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="mt-6 space-y-6">
          {myPlayers.length === 0 ? (
            <Card className="border-none shadow-xl"><CardContent className="p-12 text-center"><Award className="w-16 h-16 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay jugadores registrados</p></CardContent></Card>
          ) : (
            myPlayers.map(player => (
              <Card key={player.id} className="border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                  <div className="flex items-center gap-3">
                    {player.foto_url ? <img src={player.foto_url} alt={player.nombre} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" /> : <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">{player.nombre.charAt(0)}</div>}
                    <div><CardTitle className="text-2xl">{player.nombre}</CardTitle><p className="text-slate-600 text-sm mt-1">{player.deporte}</p></div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {certificateTypes.map(cert => (
                      <div key={cert.id} className={`${cert.bgColor} rounded-2xl p-4 border-2 border-transparent hover:border-orange-300 transition-all`}>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cert.color} flex items-center justify-center mb-3 mx-auto shadow-lg`}>
                          <cert.icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mb-1 text-center">{cert.id}</h3>
                        <p className="text-xs text-slate-600 text-center mb-3">{cert.description}</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => cert.special ? setTorneoDialog({ open: true, player }) : generatePDF(player, cert.id)} 
                            disabled={generating}
                            className="flex-1 bg-slate-800 hover:bg-slate-900 text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (cert.special) {
                                toast.info("Primero genera el certificado de torneo, luego podrás enviarlo");
                              } else {
                                setEmailDialog({ open: true, player, tipo: cert.id });
                                setEmailDestino(user?.email || "");
                              }
                            }} 
                            disabled={generating}
                            className="text-xs"
                          >
                            <Mail className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Historial de certificados */}
                  {getPlayerCertificates(player.id).length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <Button 
                        variant="ghost" 
                        onClick={() => setHistoryDialog({ open: true, player })}
                        className="w-full text-slate-600 hover:text-slate-900"
                      >
                        <History className="w-4 h-4 mr-2" />
                        Ver historial ({getPlayerCertificates(player.id).length} certificados generados)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="cards" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myPlayers.length === 0 ? (
              <Card className="border-none shadow-xl col-span-full"><CardContent className="p-12 text-center"><CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay jugadores registrados</p></CardContent></Card>
            ) : (
              myPlayers.map(player => (
                <div key={player.id} className="space-y-4">
                  {/* FRONTAL DEL CARNET */}
                  <div>
                    <p className="text-xs text-slate-500 text-center mb-2 font-medium">📇 Frontal</p>
                    <Card ref={el => cardRefs.current[player.id] = el} className="border-4 border-orange-600 shadow-2xl overflow-hidden mx-auto" style={{ width: '350px', height: '220px' }}>
                      <div className="h-full bg-gradient-to-br from-slate-900 via-black to-orange-900 p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <img src={CLUB_LOGO_URL} alt="Logo" className="w-12 h-12 object-contain" />
                          <div className="text-right"><h2 className="text-white font-bold text-xs">CD BUSTARVIEJO</h2><p className="text-orange-400 text-[10px]">TEMPORADA {season}</p></div>
                        </div>
                        <div className="flex-1 flex gap-3">
                          <div className="flex-shrink-0">
                            {player.foto_url ? <img src={player.foto_url} alt={player.nombre} className="w-24 h-24 rounded-lg object-cover border-3 border-orange-500" /> : <div className="w-24 h-24 bg-slate-700 rounded-lg flex items-center justify-center border-3 border-orange-500"><UserIcon className="w-10 h-10 text-white" /></div>}
                          </div>
                          <div className="flex-1 space-y-1 text-white">
                            <div><p className="text-[10px] text-orange-400 uppercase">Jugador</p><p className="font-bold text-sm leading-tight">{player.nombre}</p></div>
                            <div><p className="text-[10px] text-orange-400 uppercase">Categoría</p><p className="font-semibold text-[11px]">{player.deporte}</p></div>
                            <div><p className="text-[10px] text-orange-400 uppercase">ID</p><p className="font-mono text-[9px]">{player.id.substring(0, 12)}</p></div>
                          </div>
                        </div>
                        <div className="flex items-end justify-between mt-2 pt-2 border-t border-orange-500/30">
                          <div className="text-white text-[10px]"><p className="text-orange-400 uppercase mb-0.5">Fecha de nacimiento</p><p className="text-[11px]">{player.fecha_nacimiento ? new Date(player.fecha_nacimiento).toLocaleDateString('es-ES') : 'N/A'}</p></div>
                          {qrRefs.current[player.id] ? (
                            <img src={qrRefs.current[player.id]} alt="QR" className="w-12 h-12 rounded" />
                          ) : (
                            <div className="bg-white p-1 rounded"><div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center"><span className="text-orange-500 text-[10px] font-bold">QR</span></div></div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* TRASERA DEL CARNET */}
                  <div>
                    <p className="text-xs text-slate-500 text-center mb-2 font-medium">🔄 Trasera</p>
                    <Card ref={el => cardRefs.current[`${player.id}_back`] = el} className="border-4 border-orange-600 shadow-2xl overflow-hidden mx-auto" style={{ width: '350px', height: '220px' }}>
                      <div className="h-full bg-gradient-to-br from-slate-100 to-slate-200 p-4 flex flex-col">
                        <div className="flex items-center justify-center gap-2 mb-3 pb-2 border-b border-orange-300">
                          <img src={CLUB_LOGO_URL} alt="Logo" className="w-8 h-8 object-contain" />
                          <span className="text-orange-600 font-bold text-sm">CD BUSTARVIEJO</span>
                        </div>
                        
                        <div className="flex-1 space-y-2 text-slate-700">
                          <div className="flex items-center gap-2 text-xs">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            <span>Bustarviejo, Madrid</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="w-3 h-3 text-orange-500" />
                            <span>CDBUSTARVIEJO@GMAIL.COM</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="w-3 h-3 text-orange-500" />
                            <span>Contacto: Ver web del club</span>
                          </div>
                          
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                            <p className="text-[10px] font-bold text-red-700 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> EN CASO DE EMERGENCIA
                            </p>
                            <p className="text-[9px] text-red-600 mt-1">
                              Contactar al entrenador o llamar al 112
                            </p>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-orange-300 mt-auto">
                          <p className="text-[8px] text-slate-500 text-center">
                            Este carnet es personal e intransferible. Válido temporada {season}
                          </p>
                          <p className="text-[8px] text-orange-600 text-center font-medium mt-1">
                            www.cdbustarviejo.es
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={() => downloadCardPDF(player)} className="w-full bg-orange-600 hover:bg-orange-700" disabled={generating}>
                      <FileDown className="w-4 h-4 mr-2" />
                      📄 Descargar Carnet Completo (PDF)
                    </Button>
                    <div className="flex gap-2">
                      <Button onClick={() => downloadCard(player)} variant="outline" size="sm" className="flex-1 text-xs" disabled={generating}>
                        <Download className="w-3 h-3 mr-1" />
                        Solo Frontal
                      </Button>
                      <Button onClick={() => downloadCardBack(player)} variant="outline" size="sm" className="flex-1 text-xs" disabled={generating}>
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Solo Trasera
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {generating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8"><div className="text-center"><Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" /><p className="text-lg font-semibold text-slate-900">Generando...</p></div></Card>
        </div>
      )}

      {/* Dialog: Enviar por Email */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => !open && setEmailDialog({ open: false, player: null, tipo: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-600" />
              Enviar Certificado por Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Certificado:</strong> {emailDialog.tipo}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Jugador:</strong> {emailDialog.player?.nombre}
              </p>
            </div>
            <div>
              <Label htmlFor="email">Email de destino</Label>
              <Input
                id="email"
                type="email"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                placeholder="ejemplo@email.com"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, player: null, tipo: null })}>
              Cancelar
            </Button>
            <Button onClick={handleEmailCertificate} className="bg-orange-600 hover:bg-orange-700">
              <Send className="w-4 h-4 mr-2" />
              Enviar y Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Certificado de Torneo */}
      <Dialog open={torneoDialog.open} onOpenChange={(open) => !open && setTorneoDialog({ open: false, player: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Certificado de Participación en Torneo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-800">
                <strong>Jugador:</strong> {torneoDialog.player?.nombre}
              </p>
            </div>
            <div>
              <Label htmlFor="torneo-nombre">Nombre del Torneo *</Label>
              <Input
                id="torneo-nombre"
                value={torneoData.nombre}
                onChange={(e) => setTorneoData({ ...torneoData, nombre: e.target.value })}
                placeholder="Ej: Torneo de Navidad"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="torneo-fecha">Fecha del Torneo</Label>
              <Input
                id="torneo-fecha"
                type="date"
                value={torneoData.fecha}
                onChange={(e) => setTorneoData({ ...torneoData, fecha: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="torneo-posicion">Posición Obtenida</Label>
              <Select value={torneoData.posicion} onValueChange={(v) => setTorneoData({ ...torneoData, posicion: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona posición (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="🥇 Campeón">🥇 Campeón</SelectItem>
                  <SelectItem value="🥈 Subcampeón">🥈 Subcampeón</SelectItem>
                  <SelectItem value="🥉 Tercer puesto">🥉 Tercer puesto</SelectItem>
                  <SelectItem value="Participante">Participante</SelectItem>
                  <SelectItem value="Fair Play">🤝 Premio Fair Play</SelectItem>
                  <SelectItem value="Mejor Jugador">⭐ Mejor Jugador</SelectItem>
                  <SelectItem value="Mejor Portero">🧤 Mejor Portero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTorneoDialog({ open: false, player: null })}>
              Cancelar
            </Button>
            <Button onClick={handleTorneoCertificate} className="bg-purple-600 hover:bg-purple-700">
              <Download className="w-4 h-4 mr-2" />
              Generar Certificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial de Certificados */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => !open && setHistoryDialog({ open: false, player: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              Historial de Certificados - {historyDialog.player?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyDialog.player && getPlayerCertificates(historyDialog.player.id).length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay certificados generados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyDialog.player && getPlayerCertificates(historyDialog.player.id).map(cert => (
                  <div key={cert.id} className="bg-slate-50 rounded-xl p-4 border">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            cert.tipo_certificado === "Inscripción" ? "bg-blue-500" :
                            cert.tipo_certificado === "Pagos al Día" ? "bg-green-500" :
                            cert.tipo_certificado === "Asistencia" ? "bg-orange-500" :
                            "bg-purple-500"
                          }>
                            {cert.tipo_certificado}
                          </Badge>
                          {cert.enviado_por_email && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              Enviado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {format(new Date(cert.fecha_emision), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                        {cert.nombre_torneo && (
                          <p className="text-sm text-purple-700 mt-1">
                            🏆 {cert.nombre_torneo} {cert.posicion_torneo && `- ${cert.posicion_torneo}`}
                          </p>
                        )}
                        {cert.email_destino && (
                          <p className="text-xs text-slate-500 mt-1">
                            Enviado a: {cert.email_destino}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Código</p>
                        <p className="text-xs font-mono text-slate-600">{cert.codigo_verificacion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}