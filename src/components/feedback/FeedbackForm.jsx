import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';

export default function FeedbackForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    tipo: 'Sugerencia',
    titulo: '',
    descripcion: '',
    categoria: 'General',
    prioridad: 'Media'
  });
  const [capturas, setCapturas] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const response = await base44.integrations.Core.UploadFile({ file });
        return response.file_url;
      });

      const urls = await Promise.all(uploadPromises);
      setCapturas([...capturas, ...urls]);
      toast.success('Capturas subidas correctamente');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir las capturas');
    } finally {
      setUploading(false);
    }
  };

  const removeCaptura = (index) => {
    setCapturas(capturas.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.descripcion.trim()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.Feedback.create({
        ...formData,
        usuario_email: user.email,
        usuario_nombre: user.full_name || user.email,
        capturas,
        estado: 'Pendiente'
      });

      toast.success('¡Gracias por tu feedback! Lo revisaremos pronto.');
      
      setFormData({
        tipo: 'Sugerencia',
        titulo: '',
        descripcion: '',
        categoria: 'General',
        prioridad: 'Media'
      });
      setCapturas([]);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Error al enviar el feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Tipo de Retroalimentación *</Label>
        <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Bug">🐛 Bug / Error</SelectItem>
            <SelectItem value="Sugerencia">💡 Sugerencia / Mejora</SelectItem>
            <SelectItem value="Pregunta">❓ Pregunta</SelectItem>
            <SelectItem value="Otro">📝 Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Categoría *</Label>
        <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="General">General</SelectItem>
            <SelectItem value="Pagos">💳 Pagos</SelectItem>
            <SelectItem value="Chat">💬 Chat</SelectItem>
            <SelectItem value="Convocatorias">🏆 Convocatorias</SelectItem>
            <SelectItem value="Calendario">📅 Calendario</SelectItem>
            <SelectItem value="Inscripciones">👥 Inscripciones</SelectItem>
            <SelectItem value="Ropa">🛍️ Ropa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Título *</Label>
        <Input
          placeholder="Describe brevemente el problema o sugerencia"
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Descripción Detallada *</Label>
        <Textarea
          placeholder="Explica con detalle tu feedback. Cuanto más específico seas, mejor podremos ayudarte."
          value={formData.descripcion}
          onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
          rows={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Prioridad (para ti)</Label>
        <Select value={formData.prioridad} onValueChange={(value) => setFormData({...formData, prioridad: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Baja">Baja</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Crítica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Capturas de Pantalla (opcional)</Label>
        <div className="space-y-3">
          <div>
            <input
              type="file"
              id="capturas"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('capturas').click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Capturas
                </>
              )}
            </Button>
          </div>

          {capturas.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {capturas.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt={`Captura ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeCaptura(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-orange-600 to-orange-700">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar Retroalimentación'
        )}
      </Button>
    </form>
  );
}