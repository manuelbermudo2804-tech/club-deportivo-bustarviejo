import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function FeedbackModal({ open, onOpenChange, user, currentPage }) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "sugerencia",
    titulo: "",
    descripcion: "",
    email: user?.email || "",
    nombre: user?.full_name || "",
    pagina: currentPage || "",
  });
  const isValid = formData.titulo.trim().length >= 3 && formData.descripcion.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.titulo.trim().length < 3) {
      toast.error("El título debe tener al menos 3 caracteres");
      return;
    }
    if (formData.descripcion.trim().length < 10) {
      toast.error("Describe el problema con más detalle (mínimo 10 caracteres)");
      return;
    }

    setLoading(true);
    try {
      // Capturar contexto técnico para facilitar debug
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const rolUsuario = user?.role || (user?.es_entrenador ? 'coach' : user?.es_coordinador ? 'coordinator' : user?.tipo_panel || 'usuario');
      const contextoTecnico = `[${rolUsuario}] ${userAgent.slice(0, 200)}`;

      // Auto-prioridad: bugs = media, resto = baja
      const prioridadAuto = formData.tipo === 'bug' ? 'media' : 'baja';

      await base44.entities.Feedback.create({
        ...formData,
        prioridad: prioridadAuto,
        notas_admin: contextoTecnico,
      });
      setShowSuccess(true);
      setFormData({
        tipo: "sugerencia",
        titulo: "",
        descripcion: "",
        email: user?.email || "",
        nombre: user?.full_name || "",
        pagina: currentPage || "",
      });
    } catch (error) {
      toast.error("Error al enviar feedback: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💬 Sugerencias y Bugs
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo */}
          <div className="space-y-3">
            <Label className="font-semibold">¿Qué quieres reportar?</Label>
            <RadioGroup value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="bug" id="bug" />
                <Label htmlFor="bug" className="cursor-pointer flex-1">
                  <span className="font-medium">🐛 Bug</span>
                  <p className="text-xs text-slate-600">Algo no funciona correctamente</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="sugerencia" id="sugerencia" />
                <Label htmlFor="sugerencia" className="cursor-pointer flex-1">
                  <span className="font-medium">💡 Sugerencia</span>
                  <p className="text-xs text-slate-600">Una idea para mejorar</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="comentario" id="comentario" />
                <Label htmlFor="comentario" className="cursor-pointer flex-1">
                  <span className="font-medium">💭 Comentario</span>
                  <p className="text-xs text-slate-600">Feedback general</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo" className="font-semibold">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: El botón de pago no responde"
              className="text-sm"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion" className="font-semibold">Detalles * <span className="text-xs font-normal text-slate-500">(mínimo 10 caracteres)</span></Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Cuéntanos más... ¿qué sucede? ¿dónde? ¿cuándo?"
              className="text-sm min-h-24 resize-none"
            />
          </div>

          {/* Info adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Se enviará desde <strong>{formData.email}</strong>. El equipo admin lo revisará pronto.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValid}
              className="flex-1 bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={showSuccess} onOpenChange={(v) => {
      if (!v) { setShowSuccess(false); onOpenChange(false); }
    }}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>¡Gracias por tu mensaje!</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Hemos recibido tus sugerencias/bugs. Te avisaremos si necesitamos más datos.
        </p>
        <Button
          onClick={() => { setShowSuccess(false); onOpenChange(false); }}
          className="w-full bg-green-600 hover:bg-green-700 mt-3"
        >
          Entendido
        </Button>
      </DialogContent>
    </Dialog>
    </>
  );
}