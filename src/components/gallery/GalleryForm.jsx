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
import { validateImage } from "../utils/imageCompressor";

export default function GalleryForm({ album, onSubmit, onCancel, isSubmitting, userRole = "admin", coachCategories = [] }) {
  const [currentAlbum, setCurrentAlbum] = useState(album || {
    titulo: "",
    descripcion: "",
    fecha_evento: new Date().toISOString().split('T')[0],
    categoria: userRole === "coach" && coachCategories.length > 0 ? coachCategories[0] : "Todas las Categorías",
    tipo_evento: "Partido",
    fotos: [],
    visible_para_padres: true,
    destacado: false
  });

  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (e.target) e.target.value = '';
    if (files.length === 0) return;

    setUploadingPhotos(true);
    const uploaded = [];
    for (const file of files) {
      try {
        await validateImage(file);
        if (files.length > 1) toast.info(`Subiendo ${uploaded.length + 1}/${files.length}...`, { duration: 2000 });
        const response = await base44.functions.invoke('processImage', { image: file });
        const data = response.data;
        if (data?.error) {
          toast.error(data.userMessage || data.error, { duration: 8000 });
          continue;
        }
        uploaded.push({ url: data.file_url, descripcion: "", jugadores_etiquetados: [] });
      } catch (err) {
        if (err?.userMessage) {
          toast.error(err.userMessage, { duration: 10000 });
        } else {
          toast.error(`Error al subir ${file.name}. Prueba con otra foto.`);
        }
      }
    }
    if (uploaded.length > 0) {
      setCurrentAlbum({ ...currentAlbum, fotos: [...currentAlbum.fotos, ...uploaded] });
      toast.success(`${uploaded.length} foto(s) subida(s) correctamente`);
    }
    setUploadingPhotos(false);
  };

  const handleRemovePhoto = (index) => {
    const newFotos = currentAlbum.fotos.filter((_, i) => i !== index);
    setCurrentAlbum({ ...currentAlbum, fotos: newFotos });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentAlbum.titulo) {
      toast.error("El título es obligatorio");
      return;
    }

    if (currentAlbum.fotos.length === 0) {
      toast.error("Debes subir al menos una foto");
      return;
    }

    onSubmit(currentAlbum);
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
            {album ? "Editar Álbum" : "Nuevo Álbum"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Álbum *</Label>
                <Input
                  value={currentAlbum.titulo}
                  onChange={(e) => setCurrentAlbum({...currentAlbum, titulo: e.target.value})}
                  placeholder="Ej: Torneo de Navidad 2024"
                  required
                />
              </div>

              {/* Fecha del Evento */}
              <div className="space-y-2">
                <Label htmlFor="fecha_evento">Fecha del Evento *</Label>
                <Input
                  type="date"
                  value={currentAlbum.fecha_evento}
                  onChange={(e) => setCurrentAlbum({...currentAlbum, fecha_evento: e.target.value})}
                  required
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={currentAlbum.categoria}
                  onValueChange={(value) => setCurrentAlbum({...currentAlbum, categoria: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userRole === "admin" ? (
                      <>
                        <SelectItem value="Todas las Categorías">Todas las Categorías</SelectItem>
                        <SelectItem value="Fútbol Pre-Benjamín (Mixto)">⚽ Pre-Benjamín</SelectItem>
                        <SelectItem value="Fútbol Benjamín (Mixto)">⚽ Benjamín</SelectItem>
                        <SelectItem value="Fútbol Alevín (Mixto)">⚽ Alevín</SelectItem>
                        <SelectItem value="Fútbol Infantil (Mixto)">⚽ Infantil</SelectItem>
                        <SelectItem value="Fútbol Cadete">⚽ Cadete</SelectItem>
                        <SelectItem value="Fútbol Juvenil">⚽ Juvenil</SelectItem>
                        <SelectItem value="Fútbol Aficionado">⚽ Aficionado</SelectItem>
                        <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino</SelectItem>
                        <SelectItem value="Baloncesto (Mixto)">🏀 Baloncesto</SelectItem>
                      </>
                    ) : (
                      // Entrenadores/Coordinadores solo ven sus categorías
                      coachCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.includes("Baloncesto") ? "🏀" : "⚽"} {cat}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Evento */}
              <div className="space-y-2">
                <Label htmlFor="tipo_evento">Tipo de Evento</Label>
                <Select
                  value={currentAlbum.tipo_evento}
                  onValueChange={(value) => setCurrentAlbum({...currentAlbum, tipo_evento: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partido">⚽ Partido</SelectItem>
                    <SelectItem value="Entrenamiento">💪 Entrenamiento</SelectItem>
                    <SelectItem value="Torneo">🏆 Torneo</SelectItem>
                    <SelectItem value="Celebración">🎉 Celebración</SelectItem>
                    <SelectItem value="Evento del Club">🎪 Evento del Club</SelectItem>
                    <SelectItem value="Otro">📸 Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                value={currentAlbum.descripcion}
                onChange={(e) => setCurrentAlbum({...currentAlbum, descripcion: e.target.value})}
                placeholder="Describe el evento..."
                rows={3}
              />
            </div>

            {/* Subir Fotos */}
            <div className="space-y-2">
              <Label>Fotos del Álbum *</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploadingPhotos}
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingPhotos}
                    onClick={() => document.getElementById('photo-upload').click()}
                  >
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Fotos
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-slate-500 mt-2">
                    Puedes seleccionar múltiples fotos
                  </p>
                </label>
              </div>

              {/* Preview de fotos subidas */}
              {currentAlbum.fotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {currentAlbum.fotos.map((foto, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={foto.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-600">
                {currentAlbum.fotos.length} foto(s) en el álbum
              </p>
            </div>

            {/* Opciones de visibilidad */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Visible para padres</Label>
                  <p className="text-sm text-slate-500">Los padres pueden ver este álbum</p>
                </div>
                <Switch
                  checked={currentAlbum.visible_para_padres}
                  onCheckedChange={(checked) => setCurrentAlbum({...currentAlbum, visible_para_padres: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Álbum destacado</Label>
                  <p className="text-sm text-slate-500">Aparece en la parte superior</p>
                </div>
                <Switch
                  checked={currentAlbum.destacado}
                  onCheckedChange={(checked) => setCurrentAlbum({...currentAlbum, destacado: checked})}
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
                disabled={isSubmitting || uploadingPhotos}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  album ? "Actualizar Álbum" : "Crear Álbum"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}