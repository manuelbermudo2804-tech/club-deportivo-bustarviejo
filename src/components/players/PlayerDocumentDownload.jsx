import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Eye, Camera, FileText, Book } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Función para limpiar el nombre del jugador para usarlo como nombre de archivo
const sanitizeFileName = (name) => {
  if (!name) return "documento";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-zA-Z0-9\s]/g, "") // Solo letras, números y espacios
    .replace(/\s+/g, "_") // Espacios por guiones bajos
    .trim();
};

// Función para obtener la extensión del archivo desde la URL
const getFileExtension = (url) => {
  if (!url) return "";
  const urlWithoutParams = url.split("?")[0];
  const parts = urlWithoutParams.split(".");
  const ext = parts[parts.length - 1].toLowerCase();
  // Validar que sea una extensión conocida
  if (["jpg", "jpeg", "png", "gif", "pdf", "webp"].includes(ext)) {
    return ext;
  }
  return "jpg"; // Default para fotos
};

// Función para forzar la descarga de un archivo con nombre personalizado
const downloadFile = async (url, fileName) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error descargando archivo:", error);
    // Fallback: abrir en nueva pestaña
    window.open(url, "_blank");
  }
};

// Función para visualizar archivo en nueva pestaña
const viewFile = (url) => {
  window.open(url, "_blank");
};

export default function PlayerDocumentDownload({ player, variant = "dropdown", showLabels = true }) {
  const playerName = sanitizeFileName(player?.nombre);
  const tutorName = sanitizeFileName(player?.nombre_tutor_legal);
  
  const documents = [
    {
      type: "foto",
      label: "Foto Carnet",
      url: player?.foto_url,
      fileName: `Foto_${playerName}.${getFileExtension(player?.foto_url)}`,
      icon: Camera,
      color: "text-blue-600"
    },
    {
      type: "dni_jugador",
      label: "DNI Jugador (delantera)",
      url: player?.dni_jugador_url,
      fileName: `DNI_Jugador_Delantera_${playerName}.${getFileExtension(player?.dni_jugador_url)}`,
      icon: FileText,
      color: "text-green-600"
    },
    {
      type: "dni_jugador_trasero",
      label: "DNI Jugador (trasera)",
      url: player?.dni_jugador_trasero_url,
      fileName: `DNI_Jugador_Trasera_${playerName}.${getFileExtension(player?.dni_jugador_trasero_url)}`,
      icon: FileText,
      color: "text-green-600"
    },
    {
      type: "libro_familia",
      label: "Libro de Familia",
      url: player?.libro_familia_url,
      fileName: `Libro_Familia_${playerName}.${getFileExtension(player?.libro_familia_url)}`,
      icon: Book,
      color: "text-purple-600"
    },
    {
      type: "dni_tutor",
      label: "DNI Tutor (delantera)",
      url: player?.dni_tutor_legal_url,
      fileName: `DNI_Tutor_Delantera_${tutorName}_${playerName}.${getFileExtension(player?.dni_tutor_legal_url)}`,
      icon: FileText,
      color: "text-orange-600"
    },
    {
      type: "dni_tutor_trasero",
      label: "DNI Tutor (trasera)",
      url: player?.dni_tutor_legal_trasero_url,
      fileName: `DNI_Tutor_Trasera_${tutorName}_${playerName}.${getFileExtension(player?.dni_tutor_legal_trasero_url)}`,
      icon: FileText,
      color: "text-orange-600"
    }
  ].filter(doc => doc.url); // Solo mostrar documentos que existen

  if (documents.length === 0) {
    return null;
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            {showLabels && "Documentos"}
            {documents.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Documentos de {player?.nombre?.split(" ")[0]}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {documents.map((doc) => (
            <div key={doc.type}>
              <div className="px-2 py-1.5 text-xs font-medium text-slate-500 flex items-center gap-2">
                <doc.icon className={`w-3.5 h-3.5 ${doc.color}`} />
                {doc.label}
              </div>
              <div className="flex gap-1 px-2 pb-2">
                <DropdownMenuItem 
                  className="flex-1 cursor-pointer justify-center text-xs"
                  onClick={() => viewFile(doc.url)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex-1 cursor-pointer justify-center text-xs"
                  onClick={() => downloadFile(doc.url, doc.fileName)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Descargar
                </DropdownMenuItem>
              </div>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Variant "list" para mostrar en el perfil del jugador
  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div 
          key={doc.type} 
          className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border"
        >
          <div className="flex items-center gap-2">
            <doc.icon className={`w-5 h-5 ${doc.color}`} />
            <span className="text-sm font-medium">{doc.label}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => viewFile(doc.url)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => downloadFile(doc.url, doc.fileName)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-1" />
              Descargar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}