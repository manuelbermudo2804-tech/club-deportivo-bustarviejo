import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FileText, Camera, Shield, Heart, Users } from "lucide-react";

export default function PlayerStatsPreview() {
  // Datos de ejemplo simulados
  const player = {
    nombre: "Pablo García López",
    foto_url: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop&crop=face",
    categoria_principal: "Fútbol Cadete",
    posicion: "Delantero",
    fecha_nacimiento: "2010-05-15",
    dni_jugador: "12345678A",
    nombre_tutor_legal: "Carlos García Martínez",
    dni_tutor_legal: "87654321B",
    telefono: "600123456",
    email_padre: "carlos.garcia@email.com",
    direccion: "Calle Mayor 12, Bustarviejo",
    municipio: "Bustarviejo",
    tipo_inscripcion: "Renovación",
    estado_renovacion: "renovado",
    activo: true,
    lesionado: false,
    sancionado: false,
    acepta_politica_privacidad: true,
    autorizacion_fotografia: "SI AUTORIZO",
    incluye_seguro_accidentes: true,
    incluye_ficha_federativa: true,
    ficha_medica: {
      alergias: "Ninguna conocida",
      grupo_sanguineo: "A+",
      contacto_emergencia_nombre: "Carlos García",
      contacto_emergencia_telefono: "600123456",
    }
  };

  const docs = [
    { nombre: "Foto carnet", ok: true },
    { nombre: "DNI Jugador", ok: true },
    { nombre: "DNI Tutor Legal", ok: true },
    { nombre: "Libro de Familia", ok: false },
    { nombre: "Justificante pago Junio", ok: true },
    { nombre: "Justificante pago Septiembre", ok: false },
  ];

  const stats = [
    { icon: "⚽", label: "Goles", value: 7, color: "text-green-700 bg-green-50 border-green-200" },
    { icon: "🏟️", label: "Partidos", value: "12/14", color: "text-blue-700 bg-blue-50 border-blue-200" },
    { icon: "⭐", label: "Evaluación", value: "4.2/5", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    { icon: "📋", label: "Entrenamientos", value: "38/42", color: "text-purple-700 bg-purple-50 border-purple-200" },
    { icon: "🔥", label: "Racha", value: "8 seguidos", color: "text-orange-700 bg-orange-50 border-orange-200" },
    { icon: "💳", label: "Pagos", value: "Al día ✅", color: "text-green-700 bg-green-50 border-green-200" },
    { icon: "🏅", label: "Antigüedad", value: "3 temp.", color: "text-slate-700 bg-slate-50 border-slate-200" },
    { icon: "🎂", label: "Cumpleaños", value: "En 12 días", color: "text-pink-700 bg-pink-50 border-pink-200" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-slate-900">📊 Preview: Ficha Completa del Jugador</h1>
        <p className="text-slate-500 text-sm mt-1">Datos de ejemplo — así se vería la ficha con toda la información</p>
      </div>

      {/* ========== CABECERA CON FOTO ========== */}
      <Card className="border-none shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-green-700 p-6">
          <div className="flex items-center gap-4">
            <img
              src={player.foto_url}
              alt={player.nombre}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30 shadow-lg"
            />
            <div className="text-white flex-1">
              <h2 className="text-2xl font-black">{player.nombre}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className="bg-white/20 text-white">{player.categoria_principal}</Badge>
                <Badge className="bg-green-500 text-white">{player.posicion}</Badge>
                <Badge className="bg-blue-500 text-white">{player.tipo_inscripcion}</Badge>
              </div>
              <p className="text-white/70 text-sm mt-2">📅 Nacimiento: 15/05/2010 (14 años)</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ========== ESTADÍSTICAS ========== */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">📊 Estadísticas Temporada</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <div key={i} className={`rounded-xl border-2 p-3 text-center transition-all hover:scale-105 ${stat.color}`}>
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs opacity-70">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Logros */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-3 mt-4">
            <p className="text-xs font-bold text-yellow-900 mb-2">🏅 Logros</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800 text-xs">⚽ Goleador (7)</Badge>
              <Badge className="bg-orange-100 text-orange-800 text-xs">🔥 Racha +5</Badge>
              <Badge className="bg-purple-100 text-purple-800 text-xs">📋 +20 entrenamientos</Badge>
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">⭐ Evaluación destacada</Badge>
              <Badge className="bg-slate-200 text-slate-800 text-xs">🏅 Veterano (3 temp.)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== DATOS PERSONALES Y TUTOR ========== */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Datos Personales
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="DNI" value={player.dni_jugador} />
              <Row label="Fecha Nacimiento" value="15/05/2010" />
              <Row label="Dirección" value={player.direccion} />
              <Row label="Municipio" value={player.municipio} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" /> Tutor Legal
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="Nombre" value={player.nombre_tutor_legal} />
              <Row label="DNI" value={player.dni_tutor_legal} />
              <Row label="Teléfono" value={player.telefono} />
              <Row label="Email" value={player.email_padre} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== FICHA MÉDICA ========== */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> Ficha Médica
          </h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <Row label="Grupo Sanguíneo" value={player.ficha_medica.grupo_sanguineo} />
            <Row label="Alergias" value={player.ficha_medica.alergias} />
            <Row label="Contacto Emergencia" value={player.ficha_medica.contacto_emergencia_nombre} />
            <Row label="Tel. Emergencia" value={player.ficha_medica.contacto_emergencia_telefono} />
          </div>
        </CardContent>
      </Card>

      {/* ========== DOCUMENTACIÓN ========== */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" /> Documentación
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {docs.map((doc, i) => (
              <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border ${doc.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                {doc.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${doc.ok ? "text-green-800" : "text-red-800"}`}>
                  {doc.nombre}
                </span>
                <Badge className={`ml-auto text-[10px] ${doc.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {doc.ok ? "✓ Subido" : "Falta"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========== AUTORIZACIONES ========== */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-orange-600" /> Autorizaciones y Seguros
          </h3>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <StatusRow label="Política de Privacidad" ok={true} />
            <StatusRow label="Autorización Fotografía" ok={true} text="SI AUTORIZO" />
            <StatusRow label="Seguro Accidentes" ok={true} />
            <StatusRow label="Ficha Federativa" ok={true} />
          </div>
        </CardContent>
      </Card>

      {/* ========== PRÓXIMO PARTIDO ========== */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm font-bold text-blue-900">🏆 Próximo partido</p>
            <p className="text-lg text-blue-800 font-medium mt-1">vs CD Miraflores — Sáb 22 Feb, 10:00</p>
            <p className="text-xs text-blue-600 mt-1">📍 Campo Municipal de Bustarviejo · Local</p>
          </div>
        </CardContent>
      </Card>

      {/* ========== LEYENDA ========== */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <h3 className="font-bold text-slate-900 mb-3">📋 Secciones incluidas</h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700">
            <div>📸 <strong>Foto carnet</strong> — del jugador</div>
            <div>👤 <strong>Datos personales</strong> — DNI, dirección, fecha nacimiento</div>
            <div>👨‍👦 <strong>Tutor legal</strong> — nombre, DNI, contacto</div>
            <div>❤️ <strong>Ficha médica</strong> — alergias, grupo sanguíneo, emergencias</div>
            <div>📄 <strong>Documentación</strong> — estado de cada documento</div>
            <div>✅ <strong>Autorizaciones</strong> — privacidad, fotos, seguros</div>
            <div>📊 <strong>Estadísticas</strong> — goles, partidos, evaluaciones, etc.</div>
            <div>🏅 <strong>Logros</strong> — badges de rendimiento</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value || "—"}</span>
    </div>
  );
}

function StatusRow({ label, ok, text }) {
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      {ok ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
      <span className={`text-sm font-medium ${ok ? "text-green-800" : "text-red-800"}`}>{label}</span>
      {text && <Badge className="ml-auto bg-green-100 text-green-700 text-[10px]">{text}</Badge>}
    </div>
  );
}