import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileText, Pen } from "lucide-react";

const CONDICIONES_TEXTO = `📜 CONDICIONES DE USO DE LA APP DEL CLUB (FÚTBOL BASE)

1. Finalidad de la aplicación
Esta aplicación es un canal oficial de comunicación entre el club, el cuerpo técnico y las familias, destinado exclusivamente a asuntos organizativos, deportivos y administrativos relacionados con el jugador/a.

2. Normas de comunicación
Las familias se comprometen a:
• Mantener un trato respetuoso en todo momento.
• No utilizar los chats para discutir decisiones técnicas o deportivas.
• No iniciar debates colectivos en los grupos.
• Utilizar el canal con el coordinador para cualquier queja o conflicto.

3. Uso de los chats
• Los grupos con el entrenador son únicamente para información breve, asistencia y avisos.
• Las quejas, reclamaciones o conflictos solo se tratan de forma privada con el coordinador.
• El club se reserva el derecho de intervenir conversaciones en caso de uso indebido.

4. Contenido prohibido
Queda terminantemente prohibido:
• Enviar mensajes ofensivos, amenazantes o despectivos.
• Compartir datos personales de terceros.
• Enviar imágenes, vídeos, audios o documentos no autorizados.
• Reenviar mensajes fuera de la aplicación.

5. Protección del menor
Las familias reconocen que:
• No está permitido compartir imágenes o vídeos de menores en los chats.
• Los perfiles no mostrarán fotografías de los jugadores.
• La información tratada es confidencial.

6. Sanciones por mal uso
El incumplimiento de estas normas podrá dar lugar a:
• Limitación temporal del uso del chat.
• Bloqueo del acceso a la aplicación.
• Comunicación directa con la dirección del club.
• Medidas disciplinarias conforme al reglamento interno.

7. Protección de datos (RGPD)
De acuerdo con el Reglamento (UE) 2016/679:
• Los datos serán usados únicamente para la gestión deportiva.
• No se cederán a terceros.
• El usuario podrá ejercer sus derechos de acceso, rectificación y cancelación.
• Los mensajes se eliminarán automáticamente tras el periodo definido por el club.`;

export default function ChatTermsDialog({ open, onAccept, onDecline, user, tipoChat }) {
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.strokeStyle = '#1e293b';
      context.lineWidth = 2;
      context.lineCap = 'round';
      setCtx(context);
    }
  }, [open]);

  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (isDrawing && canvasRef.current) {
      e.preventDefault();
      setIsDrawing(false);
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignature(null);
  };

  const saveAcceptanceMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ChatAcceptance.create({
        user_email: user.email,
        user_nombre: user.full_name,
        tipo_chat: tipoChat,
        firma_base64: signature,
        fecha_aceptacion: new Date().toISOString(),
        condiciones_version: "1.0"
      });

      await base44.auth.updateMe({
        condiciones_chat_aceptadas: true,
        fecha_aceptacion_chat: new Date().toISOString()
      });

      // Enviar email de confirmación
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: user.email,
          subject: "✅ Condiciones de Uso de Chats - Aceptadas",
          body: `
            <h2>Condiciones de Uso Aceptadas</h2>
            <p>Estimado/a ${user.full_name},</p>
            <p>Confirmamos que has aceptado las condiciones de uso de los chats del club el ${new Date().toLocaleString('es-ES')}.</p>
            <hr>
            <h3>📜 Condiciones Aceptadas:</h3>
            <pre style="white-space: pre-wrap; font-size: 12px;">${CONDICIONES_TEXTO}</pre>
            <hr>
            <p style="font-size: 12px; color: #666;">
              Estas condiciones están disponibles en cualquier momento en la aplicación.
              Para cualquier duda, contacta con cdbustarviejo@gmail.com
            </p>
          `
        });
      } catch (e) {
        console.error("Error sending email:", e);
      }
    },
    onSuccess: () => {
      toast.success("✅ Condiciones aceptadas. Ya puedes usar el chat.");
      onAccept();
    },
  });

  const handleAccept = () => {
    if (!accepted) {
      toast.error("Debes aceptar las condiciones");
      return;
    }
    if (!signature) {
      toast.error("Debes firmar para aceptar");
      return;
    }
    saveAcceptanceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <FileText className="w-5 h-5" />
            📜 Condiciones de Uso - Chat {tipoChat === "coordinador" ? "Coordinador" : "Entrenador"}
          </DialogTitle>
          <DialogDescription>
            Lee atentamente y acepta las condiciones antes de usar el chat
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 border rounded-lg p-4 bg-slate-50 max-h-[400px] overflow-y-auto overscroll-contain">
          <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {CONDICIONES_TEXTO}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <Checkbox 
              id="accept-terms" 
              checked={accepted} 
              onCheckedChange={setAccepted}
            />
            <Label htmlFor="accept-terms" className="text-sm cursor-pointer">
              ✅ He leído y acepto las condiciones de uso de los chats del club
            </Label>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-bold">✍️ Firma Digital (obligatoria)</Label>
              <Button size="sm" variant="outline" onClick={clearSignature}>
                <Pen className="w-3 h-3 mr-1" />
                Borrar
              </Button>
            </div>
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              className="border-2 border-dashed border-slate-300 rounded w-full cursor-crosshair bg-white touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <p className="text-xs text-slate-500 mt-1">✍️ Dibuja tu firma con el ratón o el dedo</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            No acepto
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!accepted || !signature || saveAcceptanceMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {saveAcceptanceMutation.isPending ? "Guardando..." : "✅ Acepto y Firmo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}