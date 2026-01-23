import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Modal de preview de imagen ANTES de enviar
 * Flujo WhatsApp: foto capturada → este modal → confirmación = crear mensaje
 */
export default function ImagePreviewModal({
  imageFile,
  imageUrl,
  onConfirm,
  onCancel,
  uploading = false
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);

  const handleZoom = (delta) => {
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  if (!imageUrl && !imageFile) return null;

  const displayUrl = imageUrl || (imageFile ? URL.createObjectURL(imageFile) : "");

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-black/50">
        <h3 className="text-white font-semibold text-lg">Previsualización</h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Imagen con controles */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="relative">
          <img
            ref={imgRef}
            src={displayUrl}
            alt="Preview"
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: "transform 0.2s"
            }}
          />

          {/* Controles flotantes */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 rounded-full p-3">
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              title="Alejar"
            >
              <ZoomOut className="w-5 h-5" />
            </button>

            <button
              onClick={handleRotate}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              title="Rotar"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleZoom(0.2)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              title="Acercar"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer - Botones */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-3 p-4 bg-black/50 justify-center">
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-white text-white hover:bg-white/20 w-32"
          disabled={uploading}
        >
          Cancelar
        </Button>

        <Button
          onClick={handleConfirm}
          className="bg-green-600 hover:bg-green-700 text-white w-32"
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}