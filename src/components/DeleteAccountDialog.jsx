import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteAccountDialog({ open, onOpenChange }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error('Debes confirmar para continuar');
      return;
    }
    if (!reason || reason.trim().length < 10) {
      toast.error('Por favor, describe brevemente el motivo (mín. 10 caracteres)');
      return;
    }

    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const req = await base44.entities.AccountDeletionRequest.create({
        user_email: me?.email || 'desconocido',
        user_name: me?.full_name || '',
        reason: reason.trim(),
        status: 'solicitada',
        requested_at: new Date().toISOString(),
      });
      try { await base44.functions.invoke('notifyAccountDeletionRequest', { request: req }); } catch (e) { console.log('notifyAccountDeletionRequest error', e); }
      toast.success('Solicitud enviada. El club revisará tu caso y te informará por email.');
      onOpenChange(false);
      setConfirmed(false);
      setReason("");
    } catch (error) {
      console.error('Error creando solicitud:', error);
      toast.error('No se pudo enviar la solicitud. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[210] max-w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Solicitar eliminación de cuenta
          </DialogTitle>
          <DialogDescription>
            Tu solicitud será revisada por el club (pagos pendientes, obligaciones legales, seguridad). Te avisaremos por email con el resultado.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            Esta es una <strong>solicitud</strong> de eliminación. El club podrá <strong>denegar o posponer</strong> la baja si existen cobros/pagos pendientes, incidencias o motivos legales. Si se aprueba, la eliminación será <strong>permanente</strong>.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Motivo de la solicitud (requerido)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cuéntanos brevemente el motivo (mín. 10 caracteres)"
              className="min-h-[90px]"
            />
            <p className="text-xs text-slate-500">El club revisará historial de pagos/deudas y cumplimiento normativo antes de proceder.</p>
          </div>

          <label className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 border-red-300 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-red-900">
              Entiendo que envío una <strong>solicitud</strong> y que la eliminación solo se hará efectiva tras la revisión del club
            </span>
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setConfirmed(false);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!confirmed || loading || (reason?.trim().length || 0) < 10}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar solicitud'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}