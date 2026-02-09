import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ImportarSocios() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre_completo: "",
    dni: "",
    email: "",
    telefono: "",
    direccion: "",
    municipio: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== "admin") {
          toast.error("Solo administradores pueden acceder a esta página");
          window.location.href = "/";
          return;
        }
        setUser(currentUser);
      } catch (error) {
        toast.error("Error verificando permisos");
        window.location.href = "/";
      }
    };
    fetchUser();
  }, []);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfigForImport'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      return configs[0];
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_completo || !formData.dni || !formData.email) {
      toast.error("Por favor, rellena al menos: nombre, DNI y email");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generar número de socio
      const allMembers = await base44.entities.ClubMember.list();
      const currentYear = new Date().getFullYear();
      const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
      const nextNumber = membersThisYear.length + 1;
      const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

      // Crear socio
      await base44.entities.ClubMember.create({
        numero_socio: numeroSocio,
        nombre_completo: formData.nombre_completo,
        dni: formData.dni,
        email: formData.email,
        telefono: formData.telefono || "",
        direccion: formData.direccion || "",
        municipio: formData.municipio || "",
        cuota_socio: 25,
        tipo_inscripcion: "Nueva Inscripción",
        estado_pago: "Pendiente",
        temporada: seasonConfig?.temporada || `${currentYear}/${currentYear + 1}`,
        activo: true,
        es_socio_externo: true,
        metodo_pago: "Formulario Externo"
      });

      // Mostrar éxito
      setSuccessMessage({
        nombre: formData.nombre_completo,
        numero: numeroSocio,
      });

      // Limpiar formulario
      setFormData({
        nombre_completo: "",
        dni: "",
        email: "",
        telefono: "",
        direccion: "",
        municipio: "",
      });

      toast.success(`✅ ${formData.nombre_completo} importado correctamente`);

      // Ocultar mensaje tras 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      toast.error("Error al importar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="space-y-6 min-h-screen">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            📝 Importar Socios desde Formulario
          </h1>
          <p className="text-slate-600">
            Introduce los datos que recibiste por email del formulario Formspree
          </p>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Importado!</h3>
              <p className="text-slate-600 mb-1">{successMessage.nombre}</p>
              <p className="text-sm text-slate-500">Número de socio: {successMessage.numero}</p>
            </div>
          </div>
        )}

        {/* Card principal */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-green-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Nuevo Socio desde Formulario
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Datos obligatorios */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-slate-900">Datos Obligatorios *</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre y Apellidos</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      placeholder="Juan García López"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      placeholder="12345678A"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Datos opcionales */}
              <div className="space-y-4 pb-4">
                <h3 className="font-semibold text-slate-900">Datos Adicionales (Opcional)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="600123456"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="municipio">Municipio</Label>
                    <Input
                      id="municipio"
                      value={formData.municipio}
                      onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                      placeholder="Bustarviejo"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      placeholder="Calle, número, piso..."
                    />
                  </div>
                </div>
              </div>

              {/* Info */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  El estado del pago se marca como "Pendiente". El socio deberá completar el pago a través de Stripe.
                </AlertDescription>
              </Alert>

              {/* Botón */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold py-6 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>✅ Importar Socio</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
          <CardHeader>
            <CardTitle className="text-lg">📋 Cómo usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <ol className="space-y-2 list-decimal list-inside">
              <li><strong>Recibe</strong> el email con los datos del formulario Formspree</li>
              <li><strong>Copia</strong> los datos: nombre, DNI, email, teléfono, dirección, municipio</li>
              <li><strong>Pega</strong> los datos en este formulario</li>
              <li><strong>Haz clic</strong> en "Importar Socio"</li>
              <li>El socio aparecerá como <strong>Pendiente de Pago</strong></li>
              <li>El socio recibirá un email para <strong>completar el pago en Stripe</strong></li>
            </ol>
            <div className="bg-white rounded-lg p-3 border border-slate-200 mt-4">
              <p className="text-xs text-slate-600">
                💡 <strong>Nota:</strong> Apenas importes, el socio necesitará hacer clic en los botones de pago (Pago Único o Suscripción) desde la página "Hacerse Socio" para completar el pago.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}