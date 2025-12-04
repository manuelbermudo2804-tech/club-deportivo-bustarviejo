import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, Mail } from "lucide-react";

export default function SecondParentSection({ 
  currentPlayer, 
  setCurrentPlayer, 
  existingFamilyPlayers = [],
  isEditing = false 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Detectar si ya hay un segundo progenitor registrado en otro jugador de la familia
  const existingSecondParent = useMemo(() => {
    if (!existingFamilyPlayers.length) return null;
    
    // Buscar el primer jugador que tenga email_tutor_2 registrado
    const playerWithTutor2 = existingFamilyPlayers.find(p => 
      p.email_tutor_2 && p.email_tutor_2.trim() !== ""
    );
    
    if (playerWithTutor2) {
      return {
        nombre: playerWithTutor2.nombre_tutor_2 || "",
        email: playerWithTutor2.email_tutor_2,
        telefono: playerWithTutor2.telefono_tutor_2 || ""
      };
    }
    return null;
  }, [existingFamilyPlayers]);

  // Si ya hay segundo progenitor y no estamos editando, mostrar versión colapsada
  const hasExistingSecondParent = existingSecondParent !== null;
  
  // Detectar si el usuario está introduciendo un segundo progenitor DIFERENTE al existente
  const isDifferentSecondParent = useMemo(() => {
    if (!hasExistingSecondParent) return false;
    if (!currentPlayer.email_tutor_2) return false;
    return currentPlayer.email_tutor_2.toLowerCase() !== existingSecondParent.email.toLowerCase();
  }, [hasExistingSecondParent, existingSecondParent, currentPlayer.email_tutor_2]);

  // Si ya hay segundo progenitor registrado y no está expandido
  if (hasExistingSecondParent && !isExpanded && !isEditing) {
    return (
      <div className="space-y-4 border-t border-slate-200 pt-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Segundo Progenitor/Tutor</h3>
        </div>
        
        {/* Alerta informativa - ya existe segundo progenitor */}
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>✅ Ya tienes registrado un segundo progenitor:</strong>
            <div className="mt-2 p-3 bg-white rounded-lg border border-green-200">
              <p className="font-medium text-green-900">{existingSecondParent.nombre || "Sin nombre"}</p>
              <p className="text-sm text-green-700">{existingSecondParent.email}</p>
              {existingSecondParent.telefono && (
                <p className="text-sm text-green-600">📱 {existingSecondParent.telefono}</p>
              )}
            </div>
            <p className="mt-2 text-xs">
              Este progenitor <strong>ya puede acceder a la app</strong> y verá automáticamente a todos los hijos registrados con su email.
            </p>
          </AlertDescription>
        </Alert>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between text-slate-600">
              <span>¿El segundo progenitor es diferente para este jugador?</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Segundo Progenitor/Tutor (Opcional)</h3>
        </div>
        {hasExistingSecondParent && isExpanded && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-slate-500"
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            Cerrar
          </Button>
        )}
      </div>

      {/* Alerta sobre invitación automática */}
      <Alert className="bg-blue-50 border-blue-200">
        <Mail className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>📧 Invitación automática:</strong> Al añadir el email del segundo progenitor, <strong>recibirá una invitación por email</strong> con un enlace único para completar su registro y acceder a la app.
        </AlertDescription>
      </Alert>

      <Alert className="bg-green-50 border-green-200">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 text-sm">
          <strong>👥 Acceso compartido:</strong> Una vez registrado, el segundo progenitor verá <strong>exactamente la misma información</strong> del jugador: pagos, convocatorias, documentos, chat del equipo, etc.
        </AlertDescription>
      </Alert>

      {hasExistingSecondParent && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>⚠️ Atención:</strong> Ya tienes registrado a <strong>{existingSecondParent.nombre || existingSecondParent.email}</strong> como segundo progenitor en otro jugador. Solo rellena estos campos si el segundo progenitor de este jugador es <strong>diferente</strong> (ej: hijos de padres/madres diferentes).
          </AlertDescription>
        </Alert>
      )}

      {isDifferentSecondParent && (
        <Alert className="bg-purple-50 border-purple-200">
          <AlertCircle className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <strong>📝 Nuevo segundo progenitor:</strong> El email que has introducido es diferente al registrado anteriormente. Se enviará una invitación a <strong>{currentPlayer.email_tutor_2}</strong>.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-slate-50 border-slate-200">
        <AlertCircle className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-slate-700 text-sm">
          Si el segundo progenitor quiere ser <strong>socio del club</strong>, debe rellenar el formulario de <strong>"Hacerse Socio"</strong> desde su propia cuenta con una cuota de 25€.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="nombre_tutor_2">Nombre y Apellidos</Label>
          <Input 
            id="nombre_tutor_2" 
            name="tutor2-name"
            autoComplete="name"
            value={currentPlayer.nombre_tutor_2 || ""} 
            onChange={(e) => setCurrentPlayer({...currentPlayer, nombre_tutor_2: e.target.value})}
            placeholder="Ej: Pedro García López" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_tutor_2">Correo Electrónico *</Label>
          <Input 
            id="email_tutor_2" 
            name="tutor2-email"
            type="email" 
            autoComplete="email"
            value={currentPlayer.email_tutor_2 || ""} 
            onChange={(e) => setCurrentPlayer({...currentPlayer, email_tutor_2: e.target.value})}
            placeholder="padre@ejemplo.com" 
          />
          <p className="text-xs text-slate-500">
            Se enviará una invitación a este email
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono_tutor_2">Teléfono (opcional)</Label>
          <Input 
            id="telefono_tutor_2" 
            name="tutor2-tel"
            type="tel" 
            autoComplete="tel"
            value={currentPlayer.telefono_tutor_2 || ""} 
            onChange={(e) => setCurrentPlayer({...currentPlayer, telefono_tutor_2: e.target.value})}
            placeholder="600654321" 
          />
        </div>
      </div>
    </div>
  );
}