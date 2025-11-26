import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, AlertCircle, CheckCircle2, Users, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";

const CUOTA_SOCIO = 25;

export default function ClubMembership() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingJustificante, setUploadingJustificante] = useState(false);
  const [formData, setFormData] = useState({
    tipo_inscripcion: "Nueva Inscripción",
    nombre_completo: "",
    dni: "",
    telefono: "",
    email: "",
    direccion: "",
    municipio: "",
    metodo_pago: "Transferencia",
    justificante_url: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData(prev => ({
        ...prev,
        email: currentUser.email,
        nombre_completo: currentUser.full_name || ""
      }));
    };
    fetchUser();
  }, []);

  const { data: myMemberships = [], isLoading } = useQuery({
    queryKey: ['myMemberships', user?.email],
    queryFn: () => user ? base44.entities.ClubMember.filter({ email: user.email }) : [],
    enabled: !!user?.email,
  });

  const { data: myPlayers = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: () => user ? base44.entities.Player.filter({ email_padre: user.email }) : [],
    enabled: !!user?.email,
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const createMembershipMutation = useMutation({
    mutationFn: async (data) => {
      const membership = await base44.entities.ClubMember.create({
        ...data,
        cuota_socio: CUOTA_SOCIO,
        estado_pago: data.justificante_url ? "En revisión" : "Pendiente",
        temporada: seasonConfig?.temporada || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
        es_segundo_progenitor: true,
        jugadores_relacionados: myPlayers.map(p => ({ jugador_id: p.id, jugador_nombre: p.nombre })),
        activo: true
      });

      // Notificar al admin
      await base44.integrations.Core.SendEmail({
        to: "cdbustarviejo@gmail.com",
        subject: `Nueva solicitud de socio: ${data.nombre_completo}`,
        body: `Se ha recibido una nueva solicitud de socio:\n\nNombre: ${data.nombre_completo}\nDNI: ${data.dni}\nEmail: ${data.email}\nTeléfono: ${data.telefono}\nTipo: ${data.tipo_inscripcion}\n\nPago: ${data.justificante_url ? "Justificante subido - revisar" : "Pendiente"}\n\nAccede al panel de administración para gestionar.`
      });

      return membership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      setShowForm(false);
      toast.success("✅ Solicitud de socio enviada correctamente");
    },
    onError: (error) => {
      toast.error("Error al enviar solicitud: " + error.message);
    }
  });

  const handleJustificanteUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingJustificante(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, justificante_url: response.file_url }));
      toast.success("Justificante subido");
    } catch (error) {
      toast.error("Error al subir el archivo");
    } finally {
      setUploadingJustificante(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre_completo || !formData.dni || !formData.telefono || !formData.email || !formData.direccion || !formData.municipio) {
      toast.error("Por favor, rellena todos los campos obligatorios");
      return;
    }
    createMembershipMutation.mutate(formData);
  };

  const currentSeasonMembership = myMemberships.find(m => m.temporada === seasonConfig?.temporada);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">🎫 Hacerse Socio</h1>
        <p className="text-slate-600 text-sm mt-1">Inscripción como socio del CD Bustarviejo</p>
      </div>

      {/* Estado actual */}
      {currentSeasonMembership ? (
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-lg">Ya eres socio de la temporada {currentSeasonMembership.temporada}</h3>
                <p className="text-green-800 text-sm mt-1">
                  Estado del pago: <Badge className={
                    currentSeasonMembership.estado_pago === "Pagado" ? "bg-green-600" :
                    currentSeasonMembership.estado_pago === "En revisión" ? "bg-yellow-600" : "bg-red-600"
                  }>{currentSeasonMembership.estado_pago}</Badge>
                </p>
                {currentSeasonMembership.estado_pago === "Pendiente" && (
                  <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Recuerda subir el justificante de pago o realizar la transferencia.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Info para segundos progenitores */}
          <Alert className="bg-blue-50 border-blue-200">
            <Users className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>¿Eres el segundo progenitor de un jugador?</strong><br />
              Si tu pareja ya ha inscrito a vuestro/s hijo/s y quieres ser socio del club, puedes hacerte socio aquí con una cuota de <strong>25€</strong>.
            </AlertDescription>
          </Alert>

          {!showForm ? (
            <Card className="border-none shadow-xl">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                  <CreditCard className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="font-bold text-xl text-slate-900">Cuota de Socio</h3>
                <p className="text-4xl font-bold text-orange-600">{CUOTA_SOCIO}€</p>
                <p className="text-slate-600 text-sm">Temporada {seasonConfig?.temporada || "2024-2025"}</p>
                <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700 w-full py-6 text-lg">
                  Hacerme Socio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  Formulario de Inscripción como Socio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tipo */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Tipo de Inscripción *</Label>
                    <RadioGroup value={formData.tipo_inscripcion} onValueChange={(v) => setFormData({...formData, tipo_inscripcion: v})} className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                        <RadioGroupItem value="Nueva Inscripción" id="nueva" />
                        <Label htmlFor="nueva" className="cursor-pointer">Nueva Inscripción</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                        <RadioGroupItem value="Renovación" id="renovacion" />
                        <Label htmlFor="renovacion" className="cursor-pointer">Renovación</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Datos personales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre y Apellidos *</Label>
                      <Input id="nombre" value={formData.nombre_completo} onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI *</Label>
                      <Input id="dni" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})} placeholder="12345678A" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono Móvil *</Label>
                      <Input id="telefono" type="tel" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} placeholder="600123456" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled className="bg-slate-100" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="direccion">Dirección Completa *</Label>
                      <Input id="direccion" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} placeholder="Calle, número, piso..." required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="municipio">Municipio *</Label>
                      <Input id="municipio" value={formData.municipio} onChange={(e) => setFormData({...formData, municipio: e.target.value})} placeholder="Bustarviejo" required />
                    </div>
                  </div>

                  {/* Pago */}
                  <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50">
                    <h3 className="font-bold text-green-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Pago: {CUOTA_SOCIO}€
                    </h3>

                    <div className="space-y-3">
                      <Label className="font-semibold">Método de Pago *</Label>
                      <RadioGroup value={formData.metodo_pago} onValueChange={(v) => setFormData({...formData, metodo_pago: v})} className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                          <RadioGroupItem value="Transferencia" id="transferencia" />
                          <Label htmlFor="transferencia" className="cursor-pointer">Transferencia Bancaria</Label>
                        </div>
                        {seasonConfig?.bizum_activo && (
                          <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                            <RadioGroupItem value="Bizum" id="bizum" />
                            <Label htmlFor="bizum" className="cursor-pointer">Bizum</Label>
                          </div>
                        )}
                      </RadioGroup>
                    </div>

                    {formData.metodo_pago === "Transferencia" && (
                      <div className="bg-white rounded-lg p-4 border">
                        <p className="text-sm text-slate-700 mb-2"><strong>Datos bancarios:</strong></p>
                        <p className="text-sm font-mono">ES12 1234 5678 1234 5678 9012</p>
                        <p className="text-sm text-slate-600 mt-2">Concepto: SOCIO - {formData.nombre_completo || "Tu nombre"}</p>
                      </div>
                    )}

                    {formData.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
                      <div className="bg-white rounded-lg p-4 border">
                        <p className="text-sm text-slate-700 mb-2"><strong>Bizum al teléfono:</strong></p>
                        <p className="text-lg font-bold text-green-600">{seasonConfig.bizum_telefono}</p>
                        <p className="text-sm text-slate-600 mt-2">Concepto: SOCIO - {formData.nombre_completo || "Tu nombre"}</p>
                      </div>
                    )}

                    {/* Subir justificante */}
                    <div className="space-y-2">
                      <Label>Subir Justificante de Pago</Label>
                      <div className="flex items-center gap-2">
                        <input type="file" accept="image/*,application/pdf" onChange={handleJustificanteUpload} className="hidden" id="justificante-upload" />
                        <Button type="button" variant="outline" onClick={() => document.getElementById('justificante-upload').click()} disabled={uploadingJustificante} className="flex-1">
                          {uploadingJustificante ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                          {formData.justificante_url ? "Cambiar justificante" : "Subir justificante"}
                        </Button>
                        {formData.justificante_url && (
                          <a href={formData.justificante_url} target="_blank" rel="noopener noreferrer">
                            <Button type="button" variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                          </a>
                        )}
                      </div>
                      {formData.justificante_url && (
                        <p className="text-xs text-green-600">✅ Justificante subido correctamente</p>
                      )}
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={createMembershipMutation.isPending}>
                      {createMembershipMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : "Enviar Solicitud"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Historial de membresías */}
      {myMemberships.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Historial de Membresías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myMemberships.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{m.temporada}</p>
                    <p className="text-sm text-slate-600">{m.tipo_inscripcion}</p>
                  </div>
                  <Badge className={
                    m.estado_pago === "Pagado" ? "bg-green-600" :
                    m.estado_pago === "En revisión" ? "bg-yellow-600" : "bg-red-600"
                  }>{m.estado_pago}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}