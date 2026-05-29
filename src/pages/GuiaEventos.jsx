import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Layout, Image, Clock, Link as LinkIcon, CheckCircle2 } from "lucide-react";

const Step = ({ n, title, children }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center">
      {n}
    </div>
    <div className="flex-1 pb-6 border-l-2 border-orange-200 pl-4 -ml-5 pt-2">
      <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
      <div className="text-sm text-slate-700 space-y-2">{children}</div>
    </div>
  </div>
);

export default function GuiaEventos() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
          <Megaphone className="w-4 h-4" /> Guía interna del Admin
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Cómo lanzar un evento en la app</h1>
        <p className="text-slate-600 mt-2">San Isidro, Torneo de Pádel, Futsal… cualquier evento futuro. <strong>5 minutos, sin tocar código.</strong></p>
      </div>

      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Pasos a seguir
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Step n="1" title="Crea la landing del evento (opcional pero recomendado)">
            <p>Ve a <Badge variant="outline">Constructor de Páginas</Badge> y crea una nueva landing con el formulario de inscripción, info, precio, etc.</p>
            <p className="text-xs text-slate-500">Te dará una URL del tipo <code className="bg-slate-100 px-1 rounded">/l/torneo-padel-2026</code>.</p>
            <p>👉 Si el evento NO necesita inscripción online (ej: un comunicado), salta este paso.</p>
          </Step>

          <Step n="2" title="Ve a Anuncios y crea uno nuevo">
            <p>Menú lateral → <Badge variant="outline">Anuncios</Badge> → botón <strong>Nuevo Anuncio</strong>.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Título:</strong> corto y vendedor (ej: "🎾 Torneo de Pádel 2026")</li>
              <li><strong>Contenido:</strong> 2-3 líneas con lo esencial</li>
              <li><strong>Prioridad:</strong> "Importante" para que se note</li>
              <li><strong>Destinatarios:</strong> "Todos" (o segmenta si solo es para una categoría)</li>
            </ul>
          </Step>

          <Step n="3" title="🎨 Activa el modo Banner">
            <p>En el formulario, activa el switch morado <strong>"Mostrar como Banner"</strong> y luego:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Estado:</strong> Activo</li>
              <li><strong>Posición:</strong> Arriba (más visible) o Abajo (menos invasivo)</li>
              <li><strong>Estilo:</strong> elige color según el tono (Éxito=verde, Info=azul, Aviso=naranja, Urgente=rojo)</li>
            </ul>
          </Step>

          <Step n="4" title={<><Image className="inline w-4 h-4" /> Añade imagen de fondo (opcional)</>}>
            <p>Pega la URL de una imagen relacionada con el evento. El banner la mostrará difuminada de fondo. Súbela primero a la galería o a otro hosting y copia el enlace.</p>
          </Step>

          <Step n="5" title={<><LinkIcon className="inline w-4 h-4" /> Configura el botón de acción</>}>
            <p>Esto es lo que convierte el banner en una <strong>llamada a la acción</strong>:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Texto del botón:</strong> "¡Apúntate ya!", "Ver detalles", "Reservar plaza"…</li>
              <li><strong>URL destino:</strong> la landing del paso 1 (ej: <code className="bg-slate-100 px-1 rounded">/l/torneo-padel-2026</code>) o cualquier ruta interna (<code className="bg-slate-100 px-1 rounded">/SanIsidro</code>, <code className="bg-slate-100 px-1 rounded">/Porra</code>…)</li>
            </ul>
          </Step>

          <Step n="6" title={<><Clock className="inline w-4 h-4" /> Activa la cuenta atrás (opcional)</>}>
            <p>Pon la <strong>fecha y hora del evento</strong> o de cierre de inscripciones. El banner mostrará un contador en vivo (días / horas / minutos). Crea urgencia y funciona muy bien.</p>
          </Step>

          <Step n="7" title="Caducidad automática">
            <p>Configura cuándo debe desaparecer solo: <strong>"Por horas"</strong> (24h, 48h, 1 semana…) o <strong>"Fecha específica"</strong>. Cuando expire, el banner desaparece de la app sin que tengas que tocar nada.</p>
          </Step>

          <Step n="8" title="Publica y listo">
            <p>Pulsa <strong>Publicar Anuncio</strong>. En segundos aparece el banner en la app de TODAS las familias 🎉.</p>
            <p className="text-xs text-slate-500">Si necesitas pararlo: vuelve al anuncio y desactiva el switch "Estado" del banner. Sigue ahí, pero no se ve.</p>
          </Step>
        </CardContent>
      </Card>

      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="pt-6">
          <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
            <Layout className="w-5 h-5" /> Resumen visual
          </h3>
          <p className="text-sm text-emerald-800">
            <strong>Landing</strong> (Constructor) → <strong>Anuncio con banner</strong> (Anuncios) → <strong>Aparece en toda la app</strong>.
          </p>
          <p className="text-sm text-emerald-700 mt-2">
            Esto vale para CUALQUIER evento futuro: San Isidro 2027, torneo Pádel, torneo Futsal, cena de Navidad, sorteo de Reyes… No tienes que pedirme que toque código nunca más para este tipo de campañas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}