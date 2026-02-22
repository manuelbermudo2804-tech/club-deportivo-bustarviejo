import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, AlertCircle, ChevronDown, ChevronUp, Clock, Loader2, Sparkles, Info, CheckCircle2, Send, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function SecondParentSection({ 
  currentPlayer, 
  setCurrentPlayer, 
  existingFamilyPlayers,
  isEditing 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [existingSecondParent, setExistingSecondParent] = useState(null);
  const [pendingCode, setPendingCode] = useState(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  
  const segundoProgenitorEnOtrosHermanos = existingFamilyPlayers?.some(p => 
    p.email_tutor_2 && p.email_tutor_2.trim() !== ""
  );
  
  const datosSegundoProgenitorHermano = existingFamilyPlayers?.find(p => 
    p.email_tutor_2 && p.email_tutor_2.trim() !== ""
  );

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  useEffect(() => {
    if (existingFamilyPlayers.length > 0 && currentUser) {
      const playerWithSecondParent = existingFamilyPlayers.find(p => 
        p.email_tutor_2 && 
        p.email_tutor_2 !== currentUser.email &&
        p.nombre_tutor_2
      );
      if (playerWithSecondParent) {
        setExistingSecondParent({
          nombre: playerWithSecondParent.nombre_tutor_2,
          email: playerWithSecondParent.email_tutor_2,
          telefono: playerWithSecondParent.telefono_tutor_2
        });
      }
    }
  }, [existingFamilyPlayers, currentUser]);

  // Buscar código de acceso pendiente para este jugador (tipo segundo_progenitor)
  useEffect(() => {
    if (currentPlayer.id && currentPlayer.email_tutor_2) {
      checkPendingCode();
    }
  }, [currentPlayer.id, currentPlayer.email_tutor_2]);

  const checkPendingCode = async () => {
    try {
      const codes = await base44.entities.AccessCode.filter({
        jugador_id: currentPlayer.id,
        tipo: "segundo_progenitor",
        estado: "pendiente"
      });
      if (codes.length > 0) {
        setPendingCode(codes[0]);
      }
    } catch (err) {
      console.error("Error checking access codes:", err);
    }
  };

  const useExistingSecondParent = () => {
    if (existingSecondParent) {
      setCurrentPlayer({
        ...currentPlayer,
        nombre_tutor_2: existingSecondParent.nombre,
        email_tutor_2: existingSecondParent.email,
        telefono_tutor_2: existingSecondParent.telefono || ""
      });
      toast.success("Datos del segundo progenitor cargados");
    }
  };

  // Enviar invitación directa al segundo progenitor (genera código de acceso)
  const sendInvitation = async () => {
    if (!currentPlayer.email_tutor_2?.trim()) {
      toast.error("Introduce el email del segundo progenitor");
      return;
    }
    if (!currentPlayer.id) {
      toast.info("Primero guarda el jugador, luego podrás enviar la invitación");
      return;
    }

    setIsSendingInvitation(true);
    try {
      const { data } = await base44.functions.invoke("generateAccessCode", {
        email: currentPlayer.email_tutor_2.trim().toLowerCase(),
        tipo: "segundo_progenitor",
        nombre_destino: currentPlayer.nombre_tutor_2 || "",
        jugador_id: currentPlayer.id,
        jugador_nombre: currentPlayer.nombre
      });

      if (data.success) {
        setPendingCode({ codigo: data.codigo, estado: 'pendiente' });
        toast.success(`✅ Invitación enviada a ${currentPlayer.email_tutor_2}`);
      } else {
        toast.error(data.error || "Error al enviar invitación");
      }
    } catch (err) {
      console.error("Error enviando invitación:", err);
      toast.error("Error al enviar la invitación");
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const hasCompleteSecondParent = currentPlayer.nombre_tutor_2 && 
                                   currentPlayer.email_tutor_2 && 
                                   currentPlayer.telefono_tutor_2;

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <span className="text-lg font-semibold text-slate-900">
                Segundo Progenitor/Tutor (Opcional)
              </span>
              {hasCompleteSecondParent && (
                <Badge className="bg-green-100 text-green-800 text-xs ml-2">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Registrado
                </Badge>
              )}
              {pendingCode && (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-2">
                  <Clock className="w-3 h-3 mr-1" />
                  Invitación enviada
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="pt-4 space-y-4">
            
            {/* ALERTA SI YA HAY SEGUNDO PROGENITOR EN HERMANOS */}
            {segundoProgenitorEnOtrosHermanos && !currentPlayer.email_tutor_2 && datosSegundoProgenitorHermano && (
              <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400">
                <Sparkles className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-bold text-base mb-2">
                    ✅ Ya tienes segundo progenitor en otro hijo
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-green-300 text-sm space-y-1 mb-3">
                    <p><strong>Nombre:</strong> {datosSegundoProgenitorHermano.nombre_tutor_2}</p>
                    <p><strong>Email:</strong> {datosSegundoProgenitorHermano.email_tutor_2}</p>
                    {datosSegundoProgenitorHermano.telefono_tutor_2 && (
                      <p><strong>Teléfono:</strong> {datosSegundoProgenitorHermano.telefono_tutor_2}</p>
                    )}
                  </div>
                  <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                    <p className="text-sm font-semibold mb-1">💡 ¿Son los mismos progenitores?</p>
                    <p className="text-sm">
                      <strong>No hace falta</strong> que rellenes esta sección de nuevo. Ambos padres ya recibirán 
                      notificaciones de este nuevo hijo automáticamente.
                    </p>
                    <p className="text-xs mt-2 text-green-700">
                      ℹ️ Solo rellena si el segundo progenitor de <strong>este hijo</strong> es diferente al de tus otros hijos.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Timeline de pasos */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="font-bold text-blue-900 mb-3 text-sm">👥 ¿Cómo funciona la invitación?</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-xs">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Rellenas sus datos aquí</p>
                    <p className="text-xs text-blue-700">Nombre, email y teléfono</p>
                  </div>
                </div>
                <div className="w-px h-3 bg-blue-300 ml-3.5" />
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-xs">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Pulsas "Enviar invitación"</p>
                    <p className="text-xs text-orange-700">Se envía un email con un código de acceso automáticamente</p>
                  </div>
                </div>
                <div className="w-px h-3 bg-blue-300 ml-3.5" />
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-xs">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900">Se registra con el código</p>
                    <p className="text-xs text-green-700">Accederá a la misma ficha: pagos, convocatorias, chat…</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Si ya existe segundo progenitor en otros hijos */}
            {existingSecondParent && !hasCompleteSecondParent && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>💡 Segundo progenitor detectado:</strong> Ya tienes registrado a <strong>{existingSecondParent.nombre}</strong> ({existingSecondParent.email}).
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto font-bold ml-2"
                    onClick={useExistingSecondParent}
                  >
                    Usar estos datos →
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Nota sobre cuota de socio */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Si el segundo progenitor quiere ser socio del club, debe rellenar el formulario de <strong>"Hacerse Socio"</strong> desde su propia cuenta con una cuota de 25€.
              </AlertDescription>
            </Alert>

            {/* Campos del formulario */}
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
                <Label htmlFor="email_tutor_2">Correo Electrónico</Label>
                <Input 
                  id="email_tutor_2" 
                  name="tutor2-email"
                  type="email" 
                  autoComplete="email"
                  value={currentPlayer.email_tutor_2 || ""} 
                  onChange={(e) => setCurrentPlayer({...currentPlayer, email_tutor_2: e.target.value})}
                  placeholder="padre@ejemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefono_tutor_2">Teléfono</Label>
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

            {/* Botón de enviar invitación + Estado */}
            {isEditing && currentPlayer.email_tutor_2 && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                {pendingCode ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <KeyRound className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      ✅ Invitación enviada — código: <strong className="font-mono">{pendingCode.codigo}</strong>
                    </span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={sendInvitation}
                    disabled={isSendingInvitation || !currentPlayer.email_tutor_2?.trim()}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-5 font-bold"
                  >
                    {isSendingInvitation ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando invitación...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Enviar invitación al segundo progenitor</>
                    )}
                  </Button>
                )}
                <p className="text-xs text-slate-500 text-center">
                  Se enviará un email con un código de acceso. El segundo progenitor podrá registrarse y acceder inmediatamente.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}