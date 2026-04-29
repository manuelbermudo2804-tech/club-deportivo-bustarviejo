import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PlayerRegistrationInvitation({ user, onClose, isPlayer = false }) {
  const step = 'invitation';
  const handleStartRegistration = async () => {
    try {
      // Marcar que debe mostrar el formulario en ParentPlayers
      await base44.auth.updateMe({ 
        debe_mostrar_registro_jugador: true,
        app_instalada: true
      });
      console.log('✅ Flag debe_mostrar_registro_jugador activado');
    } catch(e) { 
      console.log('Error marking flag:', e);
    }
    
    // Detectar destino según el tipo de usuario:
    //  - Jugador +18 sin ficha → PlayerDashboard (con ?registro=1 para auto-abrir wizard)
    //  - Familias / resto → ParentPlayers (que también detecta y abre el wizard)
    const isAdultPlayerWithoutProfile = isPlayer || 
      ((user?.tipo_panel === 'jugador_adulto' || user?.es_jugador === true) && !user?.player_id);
    const target = isAdultPlayerWithoutProfile 
      ? '/PlayerDashboard?registro=1' 
      : '/parentplayers';
    
    if (onClose) onClose();
    setTimeout(() => {
      window.location.href = target;
    }, 500);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}} modal={true}>
      <DialogContent hideClose={true} className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {step === 'invitation' && (
          <div className="text-center space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Bienvenido al Club</h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isPlayer 
                  ? "Para completar tu perfil, necesitamos registrarte como jugador"
                  : "Para empezar, registra a tu primer jugador"
                }
              </p>
            </div>

            {/* Info */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 space-y-3 border-2 border-orange-200">
              <p className="text-orange-900 font-semibold text-sm">
                {isPlayer 
                  ? "Vamos a crear tu perfil como jugador en el club"
                  : "Vamos a registrar a tu hijo/a para que pueda participar"
                }
              </p>
              <ul className="text-left space-y-2 text-sm text-orange-800">
                <li className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span>Foto de carnet</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span>Datos personales</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span>Documentos necesarios</span>
                </li>
              </ul>
            </div>

            {/* CTA */}
            <Button
              onClick={handleStartRegistration}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 py-3 text-lg font-bold text-white group"
            >
              Comenzar ahora
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Este paso es obligatorio para continuar usando la app
            </p>
          </div>
        )}

        {step === 'redirecting' && (
          <div className="text-center space-y-6 p-4 sm:p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Preparando formulario...</h2>
              <p className="text-slate-600 text-sm">Un momento, vamos a cargarlo</p>
            </div>
            <div className="animate-spin rounded-full h-6 w-6 border-3 border-orange-200 border-t-orange-600 mx-auto"></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}