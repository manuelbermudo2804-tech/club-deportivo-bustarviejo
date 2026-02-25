import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clipboard, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useImageUpload } from "../utils/useImageUpload";

/**
 * Botón de último recurso: "Pegar foto desde portapapeles".
 * Aparece solo si el usuario ha tenido problemas con los botones normales.
 * 
 * Flujo: el padre copia la foto en la galería (mantener pulsado → copiar),
 * vuelve a la app, pulsa "Pegar" y la imagen se sube sin usar <input type="file">.
 */
export default function PasteFromClipboard({ onUploadComplete, label = "foto", disabled = false }) {
  const [uploading, uploadFile] = useImageUpload();
  const [showHelp, setShowHelp] = useState(false);

  const handlePaste = async () => {
    try {
      // Verificar soporte
      if (!navigator.clipboard?.read) {
        toast.error('Tu navegador no soporta pegar imágenes. Prueba desde Chrome.');
        return;
      }

      toast.info('Leyendo portapapeles...', { duration: 3000 });
      
      const items = await navigator.clipboard.read();
      let imageFile = null;

      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            imageFile = new File([blob], `pegado_${Date.now()}.jpg`, { type });
            break;
          }
        }
        if (imageFile) break;
      }

      if (!imageFile) {
        toast.error('No hay ninguna imagen copiada. Copia primero la foto en tu galería (mantén pulsado → Copiar).');
        setShowHelp(true);
        return;
      }

      const url = await uploadFile(imageFile);
      if (url && onUploadComplete) {
        onUploadComplete(url);
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
        toast.error('Necesitas dar permiso para acceder al portapapeles. Acepta cuando te lo pida el navegador.');
      } else {
        toast.error('No se pudo pegar la imagen. Asegúrate de haber copiado una foto primero.');
      }
      setShowHelp(true);
    }
  };

  return (
    <div className="mt-2">
      <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-3 space-y-2">
        <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          La subida no ha funcionado. Prueba esta alternativa:
        </p>
        <p className="text-xs text-amber-800">
          Puedes copiar la imagen desde tu galería y pegarla aquí directamente.
        </p>
        
        <Button
          type="button"
          variant="outline"
          onClick={handlePaste}
          disabled={uploading || disabled}
          className="w-full min-h-[48px] border-amber-400 bg-white hover:bg-amber-50 text-amber-900 font-semibold"
        >
          {uploading ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Subiendo...</>
          ) : (
            <><Clipboard className="w-5 h-5 mr-2" /> 📋 Pegar {label} desde portapapeles</>
          )}
        </Button>

        {showHelp && (
          <div className="bg-white rounded-lg p-3 text-xs text-slate-700 space-y-1.5 border">
            <p className="font-bold text-slate-900">📖 Cómo hacerlo:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abre la <strong>Galería</strong> de tu móvil</li>
              <li>Mantén pulsada la foto que quieres usar</li>
              <li>Pulsa <strong>"Copiar"</strong></li>
              <li>Vuelve a esta app</li>
              <li>Pulsa el botón <strong>"Pegar {label}"</strong> de arriba</li>
            </ol>
          </div>
        )}

        {!showHelp && (
          <button onClick={() => setShowHelp(true)} className="text-xs text-amber-700 underline">
            ¿Cómo funciona?
          </button>
        )}
      </div>
    </div>
  );
}