import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRef } from "react";
import { User, Mail, Phone, Camera, Save, Loader2, Eye, Clock, Info, Shield, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CoachProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [photoCacheBuster, setPhotoCacheBuster] = useState(Date.now());
  const fileInputRef = useRef(null);

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

  const [uploadStatus, setUploadStatus] = useState("");

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      // If file is small enough already (<500KB), skip compression
      if (file.size < 500000) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressed = new File([blob], file.name || 'photo.jpg', { type: 'image/jpeg' });
              console.log(`[CoachProfile] Comprimida: ${(file.size/1024).toFixed(0)}KB → ${(compressed.size/1024).toFixed(0)}KB`);
              resolve(compressed);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus("Comprimiendo imagen...");
    try {
      console.log("[CoachProfile] Archivo seleccionado:", file.name, (file.size/1024).toFixed(0) + "KB", file.type);
      
      // Compress image before uploading
      const compressedFile = await compressImage(file);
      
      setUploadStatus("Subiendo foto...");
      console.log("[CoachProfile] Subiendo:", (compressedFile.size/1024).toFixed(0) + "KB");
      const result = await base44.integrations.Core.UploadFile({ file: compressedFile });
      const file_url = result?.file_url;
      
      if (!file_url) {
        console.error("[CoachProfile] UploadFile no devolvió file_url:", result);
        toast.error("Error: la subida no devolvió URL");
        return;
      }
      console.log("[CoachProfile] Foto subida OK:", file_url);

      setUploadStatus("Guardando en perfil...");
      await base44.auth.updateMe({ foto_perfil_url: file_url });
      console.log("[CoachProfile] updateMe OK");

      // Update local state with new URL + cache buster
      const ts = Date.now();
      setFormData(prev => ({ ...prev, foto_perfil_url: file_url }));
      setPhotoCacheBuster(ts);

      // Sync to CoachSettings (no blocking)
      base44.entities.CoachSettings.list('-updated_date', 50).then(allSettings => {
        const mySettings = allSettings.find(s => s.entrenador_email === user?.email);
        if (mySettings) base44.entities.CoachSettings.update(mySettings.id, { foto_perfil_url: file_url });
      }).catch(() => {});

      // Refresh user
      const freshUser = await base44.auth.me();
      setUser(freshUser);

      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['coachSettings'] });
      toast.success("✅ Foto actualizada correctamente");
    } catch (error) {
      console.error("[CoachProfile] Error subiendo foto:", error);
      toast.error("Error al subir la foto: " + (error?.message || "desconocido"));
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
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
      setEditMode(false);
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
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
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

  const categories = user.categorias_entrena || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-blue-600/20 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-24 lg:pt-12 lg:pb-28">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative group mb-4">
              {formData.foto_perfil_url ? (
                <img
                  key={photoCacheBuster}
                  src={formData.foto_perfil_url + (formData.foto_perfil_url.includes('?') ? '&' : '?') + 'v=' + photoCacheBuster}
                  alt={user.full_name}
                  className="w-28 h-28 lg:w-36 lg:h-36 rounded-full object-cover border-4 border-white/30 shadow-2xl ring-4 ring-orange-500/30"
                />
              ) : (
                <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-4xl lg:text-5xl font-bold border-4 border-white/30 shadow-2xl ring-4 ring-orange-500/30">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  // Create a fresh input each time to avoid stale event issues on mobile
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.style.display = 'none';
                  input.onchange = (e) => {
                    handlePhotoUpload(e);
                    document.body.removeChild(input);
                  };
                  document.body.appendChild(input);
                  input.click();
                }}
                disabled={uploading}
                className="absolute bottom-1 right-1 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-orange-50 transition-colors border-2 border-orange-200 group-hover:scale-110"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                ) : (
                  <Camera className="w-4 h-4 text-orange-600" />
                )}
              </button>
              {uploading && uploadStatus && (
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {uploadStatus}
                </div>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {user.full_name}
            </h1>
            <p className="text-orange-300 font-medium mt-1">
              {user.es_coordinador ? "📋 Coordinador" : "🏃 Entrenador"}
            </p>

            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {categories.map(cat => (
                  <Badge key={cat} className="bg-white/15 text-white border border-white/20 backdrop-blur-sm text-xs px-3 py-1">
                    ⚽ {cat}
                  </Badge>
                ))}
              </div>
            )}

            {formData.bio_entrenador && !editMode && (
              <p className="text-white/70 text-sm mt-3 max-w-md italic leading-relaxed">
                "{formData.bio_entrenador}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content - overlapping the hero */}
      <div className="max-w-3xl mx-auto px-4 -mt-16 pb-8 space-y-4 relative z-10">

        {/* Quick Info Cards */}
        {!editMode && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-slate-100">
              <div className="text-2xl mb-1">📧</div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Email</p>
              <p className="text-xs font-medium text-slate-700 mt-0.5 truncate">{user.email}</p>
              {formData.mostrar_email_publico && (
                <Badge className="bg-green-100 text-green-700 text-[9px] mt-1">Público</Badge>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-slate-100">
              <div className="text-2xl mb-1">📱</div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Teléfono</p>
              <p className="text-xs font-medium text-slate-700 mt-0.5">{formData.telefono_contacto || "No configurado"}</p>
              {formData.mostrar_telefono_publico && formData.telefono_contacto && (
                <Badge className="bg-green-100 text-green-700 text-[9px] mt-1">Público</Badge>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-slate-100">
              <div className="text-2xl mb-1">⚽</div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Equipos</p>
              <p className="text-lg font-bold text-slate-900">{categories.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-slate-100">
              <div className="text-2xl mb-1">🔒</div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Privacidad</p>
              <p className="text-xs font-medium text-slate-700 mt-0.5">
                {formData.mostrar_email_publico || formData.mostrar_telefono_publico ? "Contacto visible" : "Solo chat"}
              </p>
            </div>
          </div>
        )}

        {/* Edit / View Toggle */}
        {!editMode ? (
          <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Preview section */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-800">Así te ven las familias</span>
                  </div>
                  <Button
                    onClick={() => setEditMode(true)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar perfil
                  </Button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Contact visible info */}
                <div className="space-y-2">
                  {formData.mostrar_email_publico && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Email público</p>
                        <p className="text-sm text-slate-800 font-medium">{user.email}</p>
                      </div>
                    </div>
                  )}
                  {formData.mostrar_telefono_publico && formData.telefono_contacto && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Teléfono público</p>
                        <p className="text-sm text-slate-800 font-medium">{formData.telefono_contacto}</p>
                      </div>
                    </div>
                  )}
                  {!formData.mostrar_email_publico && !formData.mostrar_telefono_publico && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                      <Shield className="w-5 h-5 text-yellow-600" />
                      <p className="text-xs text-yellow-800">
                        Las familias solo pueden contactarte por el chat de la app.
                      </p>
                    </div>
                  )}
                </div>

                {/* Disponibilidad */}
                {formData.disponibilidad && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] text-blue-600 uppercase font-semibold">Disponibilidad</span>
                      <Badge className="bg-blue-200/50 text-blue-700 text-[9px]">Solo admins</Badge>
                    </div>
                    <p className="text-sm text-blue-900">{formData.disponibilidad}</p>
                  </div>
                )}

                {/* Categories */}
                {categories.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Categorías asignadas</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-3 py-1.5">
                          <span className="text-sm">⚽</span>
                          <span className="text-xs font-semibold text-blue-800">{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Edit Form */
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Pencil className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-sm">Editando perfil</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
              </div>

              <div className="p-5 space-y-6">
                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-base">✍️</span> Biografía
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio_entrenador}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio_entrenador: e.target.value }))}
                    placeholder="Ej: Entrenador con 5 años de experiencia, especializado en categorías base..."
                    rows={3}
                    className="rounded-xl border-slate-200 focus:border-orange-400 focus:ring-orange-400/20"
                  />
                  <p className="text-[10px] text-slate-400">Visible para las familias de tus equipos</p>
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-base">📱</span> Teléfono de Contacto
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono_contacto}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono_contacto: e.target.value }))}
                    placeholder="Ej: 612 345 678"
                    className="rounded-xl border-slate-200 focus:border-orange-400 focus:ring-orange-400/20"
                  />
                </div>

                {/* Disponibilidad */}
                <div className="space-y-2">
                  <Label htmlFor="disponibilidad" className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-base">🕐</span> Disponibilidad
                  </Label>
                  <Textarea
                    id="disponibilidad"
                    value={formData.disponibilidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, disponibilidad: e.target.value }))}
                    placeholder="Ej: Tardes de lunes a viernes, sábados por la mañana..."
                    rows={2}
                    className="rounded-xl border-slate-200 focus:border-orange-400 focus:ring-orange-400/20"
                  />
                  <p className="text-[10px] text-slate-400">Solo visible para coordinadores y administradores</p>
                </div>

                {/* Privacidad */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 space-y-4 border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Privacidad
                  </h4>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Mostrar email</p>
                        <p className="text-[10px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.mostrar_email_publico}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mostrar_email_publico: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Mostrar teléfono</p>
                        <p className="text-[10px] text-slate-500">{formData.telefono_contacto || "No configurado"}</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.mostrar_telefono_publico}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mostrar_telefono_publico: checked }))}
                      disabled={!formData.telefono_contacto}
                    />
                  </div>
                </div>

                {/* Save */}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl py-6 shadow-lg shadow-orange-600/20 font-bold text-base"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}