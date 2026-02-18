import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Camera, Save, Loader2, Eye, EyeOff, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CoachProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    foto_perfil_url: "",
    bio_entrenador: "",
    telefono_contacto: "",
    disponibilidad: "",
    mostrar_email_publico: false,
    mostrar_telefono_publico: false
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData({
          foto_perfil_url: currentUser.foto_perfil_url || "",
          bio_entrenador: currentUser.bio_entrenador || "",
          telefono_contacto: currentUser.telefono_contacto || "",
          disponibilidad: currentUser.disponibilidad || "",
          mostrar_email_publico: currentUser.mostrar_email_publico || false,
          mostrar_telefono_publico: currentUser.mostrar_telefono_publico || false
        });
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, foto_perfil_url: file_url }));
      toast.success("Foto subida correctamente");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
  setSaving(true);
  try {
    await base44.auth.updateMe(formData);

    // Sincronizar datos públicos a CoachSettings (accesible por familias)
    try {
      const allSettings = await base44.entities.CoachSettings.list('-updated_date', 50);
      const mySettings = allSettings.find(s => s.entrenador_email === user.email);
      const publicData = {
        entrenador_nombre: user.full_name,
        foto_perfil_url: formData.foto_perfil_url || "",
        bio_entrenador: formData.bio_entrenador || "",
        telefono_contacto: formData.telefono_contacto || "",
        mostrar_email_publico: formData.mostrar_email_publico || false,
        mostrar_telefono_publico: formData.mostrar_telefono_publico || false,
      };
      if (mySettings) {
        await base44.entities.CoachSettings.update(mySettings.id, publicData);
      }
    } catch (syncErr) {
      console.log("Error sincronizando perfil público:", syncErr);
    }

    toast.success("Perfil actualizado correctamente");
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.invalidateQueries({ queryKey: ['coachSettings'] });
  } catch (error) {
    console.error("Error saving profile:", error);
    toast.error("Error al guardar el perfil");
  } finally {
    setSaving(false);
  }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user?.es_entrenador && !user?.es_coordinador) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">
            Esta sección solo está disponible para entrenadores y coordinadores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Mi Perfil de Entrenador</h1>
        <p className="text-slate-600 text-sm mt-1">
          Gestiona tu información y controla qué datos ven las familias
        </p>
      </div>

      {/* Preview Card */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Vista previa (así te ven las familias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {formData.foto_perfil_url ? (
              <img
                src={formData.foto_perfil_url}
                alt={user.full_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900">{user.full_name}</h3>
              <p className="text-sm text-slate-600">🏃 Entrenador</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {user.categorias_entrena?.map(cat => (
                  <Badge key={cat} className="bg-blue-100 text-blue-700 text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
              {formData.bio_entrenador && (
                <p className="text-sm text-slate-600 mt-2 italic">"{formData.bio_entrenador}"</p>
              )}
              <div className="mt-2 space-y-1">
                {formData.mostrar_email_publico && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {formData.mostrar_telefono_publico && formData.telefono_contacto && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{formData.telefono_contacto}</span>
                  </div>
                )}
                {!formData.mostrar_email_publico && !formData.mostrar_telefono_publico && (
                  <p className="text-xs text-slate-400 italic">
                    (Contacto no visible para familias)
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-orange-600" />
            Información del Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto de Perfil */}
          <div className="space-y-2">
            <Label>Foto de Perfil</Label>
            <div className="flex items-center gap-4">
              {formData.foto_perfil_url ? (
                <img
                  src={formData.foto_perfil_url}
                  alt="Foto de perfil"
                  className="w-24 h-24 rounded-full object-cover border-4 border-orange-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('photo-upload').click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Subiendo..." : "Cambiar foto"}
                </Button>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Biografía / Descripción</Label>
            <Textarea
              id="bio"
              value={formData.bio_entrenador}
              onChange={(e) => setFormData(prev => ({ ...prev, bio_entrenador: e.target.value }))}
              placeholder="Ej: Entrenador con 5 años de experiencia, especializado en categorías base..."
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Esta descripción será visible para las familias de tus equipos.
            </p>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono de Contacto</Label>
            <Input
              id="telefono"
              value={formData.telefono_contacto}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono_contacto: e.target.value }))}
              placeholder="Ej: 612 345 678"
            />
          </div>

          {/* Disponibilidad */}
          <div className="space-y-2">
            <Label htmlFor="disponibilidad" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Disponibilidad
            </Label>
            <Textarea
              id="disponibilidad"
              value={formData.disponibilidad}
              onChange={(e) => setFormData(prev => ({ ...prev, disponibilidad: e.target.value }))}
              placeholder="Ej: Tardes de lunes a viernes, sábados por la mañana..."
              rows={2}
            />
            <p className="text-xs text-slate-500">
              Solo visible para coordinadores y administradores.
            </p>
          </div>

          {/* Privacidad */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Privacidad - Información visible para familias
            </h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  Mostrar mi email
                </Label>
                <p className="text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
              <Switch
                id="show-email"
                checked={formData.mostrar_email_publico}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mostrar_email_publico: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  Mostrar mi teléfono
                </Label>
                <p className="text-xs text-slate-500">
                  {formData.telefono_contacto || "No configurado"}
                </p>
              </div>
              <Switch
                id="show-phone"
                checked={formData.mostrar_telefono_publico}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mostrar_telefono_publico: checked }))}
                disabled={!formData.telefono_contacto}
              />
            </div>

            {!formData.mostrar_email_publico && !formData.mostrar_telefono_publico && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800 text-xs">
                  Las familias no podrán contactarte directamente. Usarán el chat de la app.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Categorías (solo lectura) */}
          <div className="space-y-2">
            <Label>Categorías que entreno</Label>
            <div className="flex flex-wrap gap-2">
              {user.categorias_entrena?.length > 0 ? (
                user.categorias_entrena.map(cat => (
                  <Badge key={cat} className="bg-blue-100 text-blue-700">
                    {cat}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">Sin categorías asignadas</p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Las categorías son asignadas por el administrador del club.
            </p>
          </div>

          {/* Guardar */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}