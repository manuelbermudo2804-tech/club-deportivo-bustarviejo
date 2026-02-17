import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Lock, Eye } from "lucide-react";
import { getSignedUrl, isPrivateUri } from "./privateUpload";

/**
 * Componente para visualizar/descargar archivos privados o públicos (legacy).
 * Si es un file_uri privado, solicita una URL firmada temporal.
 * Si es una URL pública (legacy), la usa directamente.
 */
export default function PrivateFileViewer({ fileUri, playerId, label, className = "" }) {
  const [loading, setLoading] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);

  if (!fileUri) return null;

  const handleView = async () => {
    if (!isPrivateUri(fileUri)) {
      // URL pública legacy - abrir directamente
      window.open(fileUri, '_blank');
      return;
    }

    setLoading(true);
    try {
      const url = await getSignedUrl(fileUri, playerId);
      if (url) {
        window.open(url, '_blank');
        setSignedUrl(url);
      }
    } catch (error) {
      console.error('Error obteniendo URL firmada:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPrivate = isPrivateUri(fileUri);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleView}
      disabled={loading}
      className={className}
      title={isPrivate ? "Ver documento protegido (URL temporal)" : "Ver documento"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPrivate ? (
        <Lock className="w-4 h-4 text-green-600" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  );
}