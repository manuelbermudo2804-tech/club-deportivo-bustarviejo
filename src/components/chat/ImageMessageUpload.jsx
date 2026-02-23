import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSafePreviewUrl } from "../utils/useImageUpload";
import { logUploadStart, logUploadError, logUploadSuccess, logFileValidationReject } from "../utils/uploadLogger";

export default function ImageMessageUpload({ file, onUploadComplete, onRemove }) {
  const [status, setStatus] = useState('uploading');
  const [preview, setPreview] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);

  // Preview local segura (modo degradado → null)
  useEffect(() => {
    if (!file || file.size === 0) return;
    const url = createSafePreviewUrl(file);
    if (url) {
      setPreview(url);
      return () => { try { URL.revokeObjectURL(url); } catch { /* ignorar */ } };
    }
    // Fallback FileReader para dispositivos sin createObjectURL
    try {
      const reader = new FileReader();
      reader.onload = (ev) => { try { setPreview(ev.target?.result || null); } catch { /* ignorar */ } };
      reader.onerror = () => { /* sin preview — no es crítico */ };
      reader.readAsDataURL(file);
    } catch { /* sin preview — no es crítico */ }
  }, [file]);

  // Subida al backend
  useEffect(() => {
    if (!file || uploadedUrl) return;

    // Guard: archivo vacío
    if (!file.size || file.size === 0) {
      logFileValidationReject(file, 'size_zero');
      setError('La imagen está vacía. Inténtalo de nuevo.');
      setStatus('error');
      return;
    }

    // Guard: archivo demasiado grande (5MB)
    if (file.size > 5 * 1024 * 1024) {
      const mb = (file.size / 1024 / 1024).toFixed(0);
      const msg = `La foto pesa ${mb}MB y el máximo es 5MB.`;
      logFileValidationReject(file, 'size_too_large');
      setError(msg);
      setStatus('error');
      return;
    }

    const upload = async () => {
      try {
        logUploadStart(file);
        const response = await base44.functions.invoke('processImage', { image: file });
        const data = response?.data;

        if (!data) throw new Error('Respuesta vacía del servidor');
        if (data.error) throw new Error(data.userMessage || data.error);
        if (!data.file_url) throw new Error('El servidor no devolvió URL de imagen');

        logUploadSuccess(file, data.file_url);
        setUploadedUrl(data.file_url);
        setStatus('sent');
        try {
          onUploadComplete?.({ url: data.file_url, nombre: file.name, tipo: 'image/jpeg' });
        } catch (cbErr) {
          logUploadError(file, cbErr, 'onUploadComplete_callback');
        }
      } catch (err) {
        logUploadError(file, err, 'ImageMessageUpload');
        setError(err.message || 'Error al subir. Inténtalo de nuevo.');
        setStatus('error');
      }
    };

    upload();
  }, [file, uploadedUrl, onUploadComplete]);

  const retry = () => {
    retryCountRef.current += 1;
    setStatus('uploading');
    setError(null);
    setUploadedUrl(null);
  };

  // Si no hay ni preview ni URL y aún subiendo, mostrar placeholder
  const displaySrc = preview || uploadedUrl;

  return (
    <div className="relative group">
      {displaySrc ? (
        <img
          src={displaySrc}
          alt="Imagen"
          className="rounded-xl max-w-full h-auto max-h-64 object-contain"
          loading="lazy"
          onError={() => setPreview(null)}
        />
      ) : (
        <div className="rounded-xl bg-slate-200 w-48 h-32 flex items-center justify-center">
          {status === 'uploading' && <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />}
          {status === 'error' && <span className="text-xs text-red-600 text-center px-2">{error}</span>}
        </div>
      )}

      {displaySrc && status === 'uploading' && (
        <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 text-white animate-spin mx-auto mb-2" />
            <p className="text-white text-xs">Subiendo...</p>
          </div>
        </div>
      )}

      {status === 'error' && displaySrc && (
        <div className="absolute inset-0 bg-orange-500/80 rounded-xl flex items-center justify-center">
          <Button size="sm" variant="ghost" onClick={retry} className="text-white hover:bg-white/20 text-xs gap-1">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
        </div>
      )}

      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-5 h-5 p-0 rounded-full"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}