import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, FileText, CheckCircle2, Loader2, CreditCard, Download, User as UserIcon, Mail, Trophy, History, Phone, MapPin, AlertCircle, RotateCcw, Send } from "lucide-react";
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

  const generatePDF = async (player, tipo) => {
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
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      let currentY = 90;
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
      
      doc.save(`Certificado-${tipo}-${player.nombre}-${season}.pdf`);
      toast.success("✅ Certificado generado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el certificado");
    }
    setGenerating(false);
  };

  const downloadCard = async (player) => {
    setGenerating(true);
    const card = cardRefs.current[player.id];
    if (!card) { toast.error("Error: Carnet no encontrado"); setGenerating(false); return; }
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `carnet_${player.nombre.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success("✅ Carnet descargado");
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error("Error al descargar el carnet");
    }
    setGenerating(false);
  };

  const certificateTypes = [
    { id: "Inscripción", icon: FileText, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50", description: "Certifica la inscripción del jugador" },
    { id: "Pagos al Día", icon: CheckCircle2, color: "from-green-500 to-green-600", bgColor: "bg-green-50", description: "Certifica que no hay pagos pendientes" },
    { id: "Asistencia", icon: Award, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50", description: "Certifica el porcentaje de asistencia" }
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {certificateTypes.map(cert => (
                      <button key={cert.id} onClick={() => generatePDF(player, cert.id)} disabled={generating} className={`${cert.bgColor} rounded-2xl p-6 border-2 border-transparent hover:border-orange-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50`}>
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cert.color} flex items-center justify-center mb-4 mx-auto shadow-lg`}><cert.icon className="w-7 h-7 text-white" /></div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{cert.id}</h3>
                        <p className="text-xs text-slate-600">{cert.description}</p>
                      </button>
                    ))}
                  </div>
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
                <div key={player.id} className="space-y-3">
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
                        <div className="text-white text-[10px]"><p className="text-orange-400 uppercase mb-0.5">Fecha de nacimiento</p><p className="text-[11px]">{new Date(player.fecha_nacimiento).toLocaleDateString('es-ES')}</p></div>
                        <div className="bg-white p-1 rounded"><div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center"><span className="text-orange-500 text-[10px] font-bold">CD</span></div></div>
                      </div>
                    </div>
                  </Card>
                  <Button onClick={() => downloadCard(player)} className="w-full bg-orange-600 hover:bg-orange-700" disabled={generating}><Download className="w-4 h-4 mr-2" />Descargar Carnet</Button>
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
    </div>
  );
}