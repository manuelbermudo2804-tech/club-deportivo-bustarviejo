import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatMessageActions({
  message,
  isMine,
  onEdit,
  onDelete,
}) {
  const handleCopy = async () => {
    const text = message?.mensaje || "";
    if (!text.trim()) {
      toast.error("Este mensaje no tiene texto que copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
        >
          <span className="text-lg">⋮</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {message?.mensaje?.trim() && (
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </DropdownMenuItem>
        )}

        {isMine && !message.eliminado && (
          <>
            <DropdownMenuItem onClick={() => onEdit(message)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(message)} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}