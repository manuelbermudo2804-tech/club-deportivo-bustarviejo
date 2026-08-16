import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function MiPerfilAcciones({ visible, onToggleVisible, onDelete, isBusy }) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/25">
      <Button
        size="sm"
        variant="ghost"
        disabled={isBusy}
        onClick={() => onToggleVisible(!visible)}
        className="text-white hover:bg-white/20 h-8"
      >
        {visible
          ? <><EyeOff className="w-4 h-4 mr-1.5" /> Ocultar mi perfil</>
          : <><Eye className="w-4 h-4 mr-1.5" /> Volver a mostrarme</>}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isBusy}
        onClick={() => setConfirm(true)}
        className="text-white hover:bg-red-500/30 h-8"
      >
        <Trash2 className="w-4 h-4 mr-1.5" /> Borrar
      </Button>
      {!visible && (
        <span className="text-[11px] bg-white/20 rounded-full px-2 py-0.5">Ahora mismo estás oculto</span>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar tu perfil de Comunidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán tu nombre, tus intereses y tu teléfono de esta sección. Podrás volver a apuntarte cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}