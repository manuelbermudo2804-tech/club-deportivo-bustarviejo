import React from "react";
import { Button } from "@/components/ui/button";
import { Reply, Edit, Trash2, Forward, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatMessageActions({ 
  message, 
  isMine, 
  isStaff,
  onReply, 
  onEdit, 
  onDelete, 
  onForward,
  onSendLocation 
}) {
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
        <DropdownMenuItem onClick={() => onReply(message)}>
          <Reply className="w-4 h-4 mr-2" />
          Responder
        </DropdownMenuItem>
        
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
        
        <DropdownMenuItem onClick={() => onForward(message)}>
          <Forward className="w-4 h-4 mr-2" />
          Reenviar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}