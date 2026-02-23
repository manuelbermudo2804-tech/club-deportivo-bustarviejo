import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, UserCircle, UserPlus } from "lucide-react";

export default function RegistrationTypeSelector({ onSelectFamily, onSelectAdultPlayer }) {

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
            ¿Qué tipo de registro deseas hacer?
          </h2>
          <p className="text-slate-600 text-base lg:text-lg">
            Elige la opción que corresponda a tu situación
          </p>
        </div>

        {/* INFO SEGUNDO PROGENITOR */}
        <Alert className="mb-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-400 shadow-lg">
          <UserPlus className="h-5 w-5 text-cyan-700" />
          <AlertDescription className="text-cyan-900">
            <p className="font-bold text-base mb-1">
              👥 ¿Tu pareja ya ha dado de alta a vuestro/a hijo/a?
            </p>
            <p className="text-sm">
              <strong>NO des de alta al jugador otra vez.</strong> Tu pareja te habrá enviado una invitación por email con un código de acceso. Usa ese código para entrar directamente.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* PANEL FAMILIA - MENORES */}
          <div 
            onClick={onSelectFamily}
            className="group cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 lg:p-10 border-4 border-orange-300 hover:border-orange-500 hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-orange-500 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Users className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-orange-900 mb-3">
                  👨‍👩‍👧 Panel de Familia
                </h3>
                <p className="text-lg font-semibold text-orange-800 mb-2">
                  Soy el <strong>primer progenitor</strong> que da de alta al jugador
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-orange-200 text-left space-y-3">
                <p className="text-sm font-bold text-orange-900">✅ Elige esto si:</p>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Vas a inscribir a tu <strong>hijo/a menor de 18 años</strong> por primera vez</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Tu pareja <strong>aún no ha dado de alta</strong> al jugador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Después podrás invitar al <strong>segundo progenitor</strong></span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl p-4">
                <p className="text-sm font-bold mb-1">📋 Tendrás acceso a:</p>
                <p className="text-xs">
                  Pagos • Convocatorias • Chat Entrenador • Chat Coordinador • Calendario • Pedidos de Ropa
                </p>
              </div>

              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold py-6 shadow-xl group-hover:bg-orange-700">
                Soy el primer progenitor →
              </Button>
            </div>
          </div>

          {/* PANEL JUGADOR +18 */}
          <div 
            onClick={onSelectAdultPlayer}
            className="group cursor-pointer bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 lg:p-10 border-4 border-green-300 hover:border-green-500 hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-green-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <UserCircle className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-green-900 mb-3">
                  👤 Panel de Jugador +18
                </h3>
                <p className="text-lg font-semibold text-green-800 mb-2">
                  Para jugadores mayores de edad que se inscriben a sí mismos
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-green-200 text-left space-y-3">
                <p className="text-sm font-bold text-green-900">✅ Elige esto si:</p>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Eres <strong>mayor de 18 años</strong> y quieres inscribirte tú mismo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Quieres un <strong>panel simplificado</strong> con tus convocatorias y pagos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span><strong>No necesitas</strong> gestionar menores de edad</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-4">
                <p className="text-sm font-bold mb-1">⚽ Tendrás acceso a:</p>
                <p className="text-xs">
                  Tus Convocatorias • Tus Pagos • Chat de Equipo • Calendario • Eventos del Club
                </p>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-6 shadow-xl group-hover:bg-green-700">
                Continuar como Jugador +18 →
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            💡 <strong>¿Dudas?</strong> Si tu pareja ya inscribió a vuestro hijo, lee el aviso azul de arriba. Si eres el primero en inscribirlo, elige "Panel de Familia".
          </p>
        </div>
      </div>
    </div>
  );
}