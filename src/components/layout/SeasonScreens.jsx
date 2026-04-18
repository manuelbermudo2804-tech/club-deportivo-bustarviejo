/**
 * Componentes de pantallas especiales de temporada (cierre, inscripciones, vacaciones, restringido).
 * Extraídos del Layout.js para reducir su tamaño.
 */
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Users, ShoppingBag, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;

export function ClosedSeasonScreen({ user, isAdmin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-32 h-32 object-contain drop-shadow-2xl mx-auto" />
            <div>
              <h1 className="text-4xl font-bold text-slate-900">🔒 Cierre de Temporada</h1>
              <p className="text-2xl text-orange-600 font-semibold">CD Bustarviejo</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-200">
              <p className="text-xl text-slate-800">La aplicación está cerrada durante <strong className="text-orange-700">Mayo</strong> por cierre de temporada.</p>
              <p className="text-lg text-slate-700 mt-2">Estamos preparando las <strong className="text-orange-700">inscripciones de Junio</strong> y la nueva temporada de <strong className="text-green-700">Septiembre</strong>.</p>
            </div>
            {user && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                <p className="text-sm text-slate-600">{user.email}</p>
                {isAdmin && <Badge className="bg-orange-600">Administrador</Badge>}
                <Button onClick={() => base44.auth.logout()} variant="outline"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</Button>
              </div>
            )}
            <div className="pt-4 border-t border-slate-200">
              <a href="mailto:info@cdbustarviejo.com" className="text-sm text-orange-600 block">INFO@CDBUSTARVIEJO.COM</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function InscriptionPeriodScreen({ user, isAdmin, clothingStoreUrl }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-900 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-32 h-32 object-contain drop-shadow-2xl mx-auto" />
            <div>
              <h1 className="text-4xl font-bold text-slate-900">📝 Periodo de Inscripciones</h1>
              <p className="text-2xl text-green-700 font-semibold">CD Bustarviejo - Junio y Julio</p>
            </div>
            <p className="text-xl text-slate-800">¡Bienvenidos al periodo de <strong className="text-green-700">inscripciones de Junio y Julio</strong>!</p>
            <div className="grid md:grid-cols-2 gap-4 pt-4">
              <Link to={isAdmin ? createPageUrl("Players") : createPageUrl("ParentPlayers")} className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg">
                  <Users className="w-5 h-5 mr-2" />
                  {isAdmin ? "Gestionar Jugadores" : "Mis Jugadores"}
                </Button>
              </Link>
              {clothingStoreUrl ? (
                <a href={clothingStoreUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 text-lg">
                    <ShoppingBag className="w-5 h-5 mr-2" />Pedidos de Equipación
                  </Button>
                </a>
              ) : (
                <Button disabled className="w-full bg-gray-300 text-gray-600 font-bold py-6 text-lg">
                  <ShoppingBag className="w-5 h-5 mr-2" />Equipación (Próximamente)
                </Button>
              )}
            </div>
            {user && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                {isAdmin && <Badge className="bg-green-600">Administrador</Badge>}
                <Button onClick={() => base44.auth.logout()} variant="outline"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function VacationPeriodScreen({ user, isAdmin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-32 h-32 object-contain drop-shadow-2xl mx-auto" />
            <h1 className="text-4xl font-bold text-slate-900">🏖️ Vacaciones de Verano</h1>
            <div className="bg-gradient-to-r from-orange-50 to-green-50 rounded-2xl p-8 border-2 border-orange-200">
              <p className="text-xl text-slate-800">Cerrado durante <strong className="text-orange-700">Agosto</strong>. Volvemos el <strong className="text-green-700">1 de Septiembre</strong>.</p>
            </div>
            <div className="text-8xl animate-bounce">☀️</div>
            {user && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                {isAdmin && <Badge className="bg-orange-600">Administrador</Badge>}
                <Button onClick={() => base44.auth.logout()} variant="outline"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RestrictedAccessScreen({ user, restriction }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm border-2 border-orange-500">
          <CardContent className="p-12 text-center space-y-6">
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-32 h-32 object-cover drop-shadow-2xl opacity-50 rounded-2xl mx-auto" />
            <h1 className="text-4xl font-bold text-slate-900">Acceso Restringido</h1>
            <div className="bg-orange-50 rounded-2xl p-8 border-2 border-orange-300">
              <p className="text-xl text-slate-800">Tu acceso ha sido <strong className="text-orange-700">restringido</strong>.</p>
              {restriction?.motivo_restriccion && (
                <div className="bg-white rounded-lg p-4 mt-4">
                  <p className="text-sm text-slate-600">Motivo:</p>
                  <p className="text-lg text-slate-900 font-medium">{restriction.motivo_restriccion}</p>
                </div>
              )}
            </div>
            {user && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                <p className="text-sm text-slate-600">{user.email}</p>
                <Button onClick={() => base44.auth.logout()} variant="outline"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</Button>
              </div>
            )}
            <div className="pt-4 border-t border-slate-200">
              <a href="mailto:info@cdbustarviejo.com" className="text-sm text-orange-600 block">INFO@CDBUSTARVIEJO.COM</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}