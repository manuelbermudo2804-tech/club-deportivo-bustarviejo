import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus, ExternalLink, Ticket } from "lucide-react";
import SorteoCountdown from "./SorteoCountdown";
import ReferralShareRow from "./ReferralShareRow";

/**
 * Cabecera del programa "Trae un socio amigo": explica en dos líneas cómo
 * participar y recuerda que CUALQUIERA puede hacerse socio.
 */
export default function ReferralIntroCard({ precio = 25, premio, premioFoto, premioFotos = [], premioTexto, sorteoFecha, sorteoLugar, onQuieroSerSocio, userEmail, userName, showShare = false }) {
  const premioUrl = "https://www.castillatermal.com/hoteles/castilla-y-leon/castilla-termal-monasterio-de-valbuena/";
  const fotosAdicionales = Array.isArray(premioFotos) ? premioFotos.filter(Boolean).slice(0, 3) : [];
  return (
    <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600">
      {premioFoto && (
        <div className="relative h-44 w-full overflow-hidden bg-slate-900 sm:h-56">
          <img src={premioFoto} alt={premio || "Premio del sorteo"} className="h-full w-full object-cover" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white shadow">
            <Ticket className="h-3.5 w-3.5 text-amber-300" /> PREMIO DEL SORTEO
          </div>
        </div>
      )}
      <CardContent className="p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black leading-tight">
              Trae un socio amigo{premio ? ` y gana ${premio}` : ""}
            </h2>
            <p className="text-white/90 text-sm mt-1">
              Por cada persona que se haga socia con tu invitación consigues una papeleta para el sorteo.
            </p>
            <p className="text-white/90 text-sm mt-2">
              <strong>Cualquiera puede ser socio</strong>: tu pareja, abuelos, tíos, vecinos o amigos. Solo {precio}€ por temporada.
            </p>
          </div>
        </div>

        {(premioTexto || premio) && (
          <div className="mt-4 rounded-2xl border border-white/25 bg-slate-950/15 p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-amber-100">Una experiencia para recordar</p>
            {premioTexto && <p className="whitespace-pre-line text-sm leading-relaxed text-white">{premioTexto}</p>}
            <a href={premioUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-amber-50">
              Descubre el hotel <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {fotosAdicionales.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/20 bg-slate-950/15 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-amber-100">Descubre el premio</p>
            <div className="grid grid-cols-3 gap-2">
              {fotosAdicionales.map((foto, index) => (
                <a key={`${foto}-${index}`} href={foto} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                  <img src={foto} alt={`Imagen adicional ${index + 1} de ${premio || "el premio"}`} loading="lazy" className="h-24 w-full object-cover sm:h-32" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 bg-white/15 rounded-2xl p-4">
          <p className="font-bold text-sm mb-2">¿Cómo funciona?</p>
          <ol className="text-sm space-y-2 text-white/95">
            <li>1️⃣ <strong>Inscripción directa:</strong> tú das de alta al nuevo socio mediante el formulario, introduces sus datos y se realiza el pago habitual. Cuando el pago se confirma, se te asigna una papeleta.</li>
            <li>2️⃣ <strong>Inscripción mediante enlace:</strong> compartes tu enlace personal y el invitado realiza el alta por su cuenta y efectúa el pago. Cuando se confirma, se te asigna igualmente una papeleta.</li>
          </ol>
          <p className="mt-3 text-sm font-bold text-white">¡Tú eliges cómo invitar! Las dos formas cuentan exactamente igual para el sorteo.</p>
        </div>

        {showShare && <ReferralShareRow userEmail={userEmail} userName={userName} />}

        <SorteoCountdown fecha={sorteoFecha} lugar={sorteoLugar} />

        {onQuieroSerSocio && (
          <Button
            onClick={onQuieroSerSocio}
            className="mt-4 w-full bg-white text-orange-700 hover:bg-amber-50 font-bold py-6"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Quiero ser socio / apuntar a alguien
          </Button>
        )}
      </CardContent>
    </Card>
  );
}