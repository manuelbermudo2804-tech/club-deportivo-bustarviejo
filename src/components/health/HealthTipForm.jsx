import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function HealthTipForm({ tip, onSubmit, onCancel, isSubmitting }) {
  const [currentTip, setCurrentTip] = useState(tip || {
    titulo: "",
    categoria: "Nutrición",
    contenido: "",
    imagen_url: "",
    para_quien: "Todos",
    destacado: false,
    publicado: true,
    fuente: "",
    link_externo: ""
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCurrentTip({ ...currentTip, imagen_url: file_url });
      toast.success("Imagen subida correctamente");
    } catch (error) {
      toast.error("Error al subir la imagen");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentTip.titulo || !currentTip.contenido) {
      toast.error("El título y contenido son obligatorios");
      return;
    }

    onSubmit(currentTip);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">
            {tip ? "Editar Consejo" : "Nuevo Consejo de Salud"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  value={currentTip.titulo}
                  onChange={(e) => setCurrentTip({...currentTip, titulo: e.target.value})}
                  placeholder="Ej: Importancia de la hidratación en deportistas"
                  required
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={currentTip.categoria}
                  onValueChange={(value) => setCurrentTip({...currentTip, categoria: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nutrición">🥗 Nutrición</SelectItem>
                    <SelectItem value="Ejercicios">💪 Ejercicios</SelectItem>
                    <SelectItem value="Hidratación">💧 Hidratación</SelectItem>
                    <SelectItem value="Descanso">😴 Descanso</SelectItem>
                    <SelectItem value="Pre-partido">⚽ Pre-partido</SelectItem>
                    <SelectItem value="Post-partido">🏁 Post-partido</SelectItem>
                    <SelectItem value="Lesiones">🏥 Lesiones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Para quién */}
              <div className="space-y-2">
                <Label htmlFor="para_quien">Dirigido a</Label>
                <Select
                  value={currentTip.para_quien}
                  onValueChange={(value) => setCurrentTip({...currentTip, para_quien: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">👥 Todos</SelectItem>
                    <SelectItem value="Infantiles (Pre-Benjamín a Infantil)">👶 Infantiles</SelectItem>
                    <SelectItem value="Juveniles (Cadete a Juvenil)">🧑 Juveniles</SelectItem>
                    <SelectItem value="Adultos (Aficionado)">👨 Adultos</SelectItem>
                    <SelectItem value="Padres">👨‍👩‍👧 Padres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contenido */}
            <div className="space-y-2">
              <Label htmlFor="contenido">Contenido *</Label>
              <Textarea
                value={currentTip.contenido}
                onChange={(e) => setCurrentTip({...currentTip, contenido: e.target.value})}
                placeholder="Escribe el contenido del consejo..."
                rows={8}
                required
              />
            </div>

            {/* Imagen */}
            <div className="space-y-2">
              <Label>Imagen (opcional)</Label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={() => document.getElementById('image-upload').click()}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir Imagen
                        </>
                      )}
                    </Button>
                  </label>
                </div>
                {currentTip.imagen_url && (
                  <div className="relative">
                    <img
                      src={currentTip.imagen_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentTip({...currentTip, imagen_url: ""})}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Fuente y Link */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fuente">Fuente (opcional)</Label>
                <Input
                  value={currentTip.fuente}
                  onChange={(e) => setCurrentTip({...currentTip, fuente: e.target.value})}
                  placeholder="Ej: Dr. Juan Pérez, nutricionista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link_externo">Link externo (opcional)</Label>
                <Input
                  value={currentTip.link_externo}
                  onChange={(e) => setCurrentTip({...currentTip, link_externo: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Publicado</Label>
                  <p className="text-sm text-slate-500">El consejo es visible para los usuarios</p>
                </div>
                <Switch
                  checked={currentTip.publicado}
                  onCheckedChange={(checked) => setCurrentTip({...currentTip, publicado: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Destacado</Label>
                  <p className="text-sm text-slate-500">Aparece en la sección destacada</p>
                </div>
                <Switch
                  checked={currentTip.destacado}
                  onCheckedChange={(checked) => setCurrentTip({...currentTip, destacado: checked})}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting || uploadingImage}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  tip ? "Actualizar Consejo" : "Publicar Consejo"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}