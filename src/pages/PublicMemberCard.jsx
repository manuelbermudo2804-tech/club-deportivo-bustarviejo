import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, MapPin, Phone, Store, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function PublicMemberCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("Enlace no válido");
      setLoading(false);
      return;
    }

    // Llamada directa sin autenticación (endpoint público)
    // Construir URL del endpoint de funciones
    const origin = window.location.origin;
    const functionsUrl = origin.includes('base44.app') || origin.includes('cdbustarviejo')
      ? `${origin}/functions/publicMemberCard`
      : `${origin}/functions/publicMemberCard`;
    
    fetch(functionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', token })
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al cargar el carnet');
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error al cargar el carnet');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
            <p className="text-lg font-semibold text-slate-900">{error}</p>
            <p className="text-sm text-slate-600">
              {error === "Servicio no disponible"
                ? "El carnet digital público no está activado en este momento. Contacta con el club."
                : "Comprueba que el enlace es correcto o contacta con el club."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = data.estado === "activo";

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-all duration-500 ${
      isActive
        ? "bg-gradient-to-br from-green-600 via-green-700 to-green-900"
        : "bg-gradient-to-br from-red-600 via-red-700 to-red-900"
    }`}>
      <div className="max-w-md w-full space-y-6">
        {/* CARNET DIGITAL */}
        <Card className="border-4 border-white shadow-2xl">
          <CardContent className="p-0">
            {/* Header */}
            <div className={`p-6 text-center text-white ${
              isActive ? "bg-gradient-to-r from-green-600 to-green-700" : "bg-gradient-to-r from-red-600 to-red-700"
            }`}>
              <img src={CLUB_LOGO} alt="Logo CD Bustarviejo" className="w-12 h-12 mx-auto mb-2 rounded-lg shadow-lg" />
              <h1 className="text-2xl font-bold mb-1">🎫 CARNET DE SOCIO</h1>
              <p className="text-sm opacity-90">CD Bustarviejo</p>
            </div>

            {/* Estado */}
            <div className={`p-8 text-center ${isActive ? "bg-green-50" : "bg-red-50"}`}>
              {isActive ? (
                <>
                  <CheckCircle2 className="w-24 h-24 text-green-600 mx-auto mb-4 animate-pulse" />
                  <p className="text-4xl font-black text-green-900 mb-2">ACTIVO</p>
                  <p className="text-lg text-green-700 font-semibold">Válido para descuentos</p>
                </>
              ) : (
                <>
                  <XCircle className="w-24 h-24 text-red-600 mx-auto mb-4 animate-pulse" />
                  <p className="text-4xl font-black text-red-900 mb-2">EXPIRADO</p>
                  <p className="text-lg text-red-700 font-semibold">No válido para descuentos</p>
                </>
              )}
            </div>

            {/* Reloj antifraude */}
            <div className="bg-slate-900 text-white p-4 text-center border-t-4 border-orange-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5" />
                <p className="text-sm font-medium">Hora actual (antifraude)</p>
              </div>
              <p className="text-3xl font-mono font-bold tracking-wider">
                {format(currentTime, "HH:mm:ss")}
              </p>
              <p className="text-sm opacity-75 mt-1">
                {format(currentTime, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            {/* Datos del socio */}
            <div className="p-6 bg-white space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Socio</p>
                <p className="text-xl font-bold text-slate-900">{data.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Número de Socio</p>
                <p className="text-lg font-mono font-bold text-orange-600">#{data.numero_socio}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Válido hasta</p>
                <p className="text-base font-semibold text-slate-700">
                  {data.fecha_vencimiento
                    ? format(new Date(data.fecha_vencimiento), "d 'de' MMMM yyyy", { locale: es })
                    : "Sin fecha de vencimiento"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comercios */}
        {data.comercios && data.comercios.length > 0 && (
          <Card className="border-2 border-white shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Store className="w-6 h-6" />
                🏪 Descuentos Disponibles
              </h2>
              <div className="space-y-3">
                {data.comercios.map((comercio, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{comercio.nombre}</h3>
                        {comercio.categoria && (
                          <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">{comercio.categoria}</Badge>
                        )}
                      </div>
                      <Badge className="bg-green-600 text-white text-lg font-bold px-3 py-1">{comercio.descuento}</Badge>
                    </div>
                    {comercio.direccion && (
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-2">
                        <MapPin className="w-3 h-3" /> {comercio.direccion}
                      </p>
                    )}
                    {comercio.telefono && (
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {comercio.telefono}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="border-2 border-white shadow-xl bg-white/95">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-2">🎫 Carnet Digital de Socio</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Este carnet te identifica como <strong>socio oficial del CD Bustarviejo</strong> y te permite acceder a descuentos exclusivos en comercios colaboradores de la zona.
              </p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <h4 className="font-bold text-orange-900 text-sm mb-2">💡 Consejo:</h4>
              <p className="text-sm text-orange-800">Guarda este enlace en los favoritos de tu móvil o añádelo a la pantalla de inicio para tenerlo siempre a mano.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}