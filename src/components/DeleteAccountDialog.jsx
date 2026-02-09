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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteAccountDialog({ open, onOpenChange }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirmed) {
      toast.error('Debes confirmar para continuar');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.deleteAccount?.();
      toast.success('Cuenta eliminada correctamente');
      base44.auth.logout();
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      toast.error('Error al eliminar la cuenta. Contacta al soporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Eliminar Cuenta
          </DialogTitle>
          <DialogDescription>
            Esta acción es permanente y no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Al eliminar tu cuenta, se borrarán todos tus datos personales, jugadores registrados y historial de pagos.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 border-red-300 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-red-900">
              Entiendo que esta acción es permanente e irreversible
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
            onClick={handleDelete}
            disabled={!confirmed || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar mi cuenta'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}