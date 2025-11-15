import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import CertificateGenerator from "../components/certificates/CertificateGenerator";

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

  const { data: certificates } = useQuery({
    queryKey: ['certificates', user?.email],
    queryFn: () => base44.entities.Certificate.list('-fecha_emision'),
    initialData: [],
    enabled: !!user,
  });

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

  const myCertificates = certificates.filter(c => 
    myPlayers.some(p => p.id === c.jugador_id)
  );

  const handleGenerateCertificate = async (player, tipo) => {
    setGenerating(true);
    try {
      const season = "2024/2025";
      const codigo = `CD-${Date.now()}-${player.id.substring(0, 8)}`;
      
      let datos = {};
      
      if (tipo === "Inscripción") {
        datos = {
          mensaje: `Se certifica que ${player.nombre} está inscrito en la categoría ${player.deporte} para la temporada ${season}.`,
          fecha_inscripcion: player.created_date
        };
      } else if (tipo === "Pagos al Día") {
        const playerPayments = payments.filter(p => p.jugador_id === player.id && p.temporada === season);
        const pendientes = playerPayments.filter(p => p.estado === "Pendiente").length;
        
        if (pendientes > 0) {
          toast.error(`No se puede generar: ${player.nombre} tiene ${pendientes} pago(s) pendiente(s)`);
          setGenerating(false);
          return;
        }
        
        datos = {
          mensaje: `Se certifica que ${player.nombre} no tiene pagos pendientes para la temporada ${season}.`,
          pagos_realizados: playerPayments.filter(p => p.estado === "Pagado").length,
          total_pagado: playerPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + p.cantidad, 0)
        };
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
        
        datos = {
          mensaje: `Se certifica que ${player.nombre} tiene un ${porcentaje}% de asistencia a entrenamientos durante la temporada ${season}.`,
          sesiones_totales: totalSessions,
          asistencias: presente,
          porcentaje_asistencia: porcentaje
        };
      }

      await base44.entities.Certificate.create({
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        tipo_certificado: tipo,
        temporada: season,
        categoria: player.deporte,
        fecha_emision: new Date().toISOString(),
        codigo_verificacion: codigo,
        datos_certificado: datos,
        solicitado_por: user.email
      });

      toast.success("✅ Certificado generado correctamente");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Error al generar el certificado");
    }
    setGenerating(false);
  };

  const certificateTypes = [
    { id: "Inscripción", icon: FileText, color: "bg-blue-500" },
    { id: "Pagos al Día", icon: CheckCircle2, color: "bg-green-500" },
    { id: "Asistencia", icon: Award, color: "bg-orange-500" }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-8 h-8 text-orange-600" />
          Certificados Digitales
        </h1>
        <p className="text-slate-600 mt-1">Genera y descarga certificados oficiales del club</p>
      </div>

      {/* Generar Nuevos Certificados */}
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
          <CardTitle>Generar Nuevo Certificado</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {myPlayers.map(player => (
              <div key={player.id} className="border rounded-xl p-4 space-y-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  {player.foto_url && (
                    <img src={player.foto_url} alt={player.nombre} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{player.nombre}</h3>
                    <p className="text-sm text-slate-600">{player.deporte}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {certificateTypes.map(cert => (
                    <Button
                      key={cert.id}
                      onClick={() => handleGenerateCertificate(player, cert.id)}
                      disabled={generating}
                      className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 border-2"
                    >
                      <cert.icon className={`w-4 h-4 ${cert.color.replace('bg-', 'text-')}`} />
                      {cert.id}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certificados Generados */}
      <Card className="border-none shadow-xl">
        <CardHeader className="border-b">
          <CardTitle>Mis Certificados</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {myCertificates.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay certificados generados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myCertificates.map(cert => (
                <CertificateGenerator key={cert.id} certificate={cert} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}