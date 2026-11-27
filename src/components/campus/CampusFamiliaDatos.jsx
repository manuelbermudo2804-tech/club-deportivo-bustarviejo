import React from "react";

const fecha = (v) => v ? new Date(String(v).length === 10 ? v + "T12:00:00" : v).toLocaleDateString("es-ES") : "—";

function Dato({ l, v }) {
  return <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p><p className="break-words text-xs font-semibold text-slate-800">{v || "—"}</p></div>;
}

// Todos los datos del adulto responsable y de la inscripción
export default function CampusFamiliaDatos({ r }) {
  const segundo = [r.segundo_progenitor_nombre, r.segundo_progenitor_telefono, r.segundo_progenitor_email].filter(Boolean).join(" · ");
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3 xl:grid-cols-6">
      <Dato l="DNI responsable" v={r.adulto_dni} />
      <Dato l="Teléfono" v={r.adulto_telefono} />
      <Dato l="Correo" v={r.adulto_email} />
      <Dato l="Nacimiento" v={fecha(r.adulto_fecha_nacimiento)} />
      <Dato l="Municipio" v={r.adulto_municipio} />
      <Dato l="Dirección" v={r.adulto_direccion} />
      <Dato l="Segundo progenitor" v={segundo} />
      <Dato l="Socio" v={r.es_socio ? (r.socio_verificado ? "Sí (verificado)" : "Sí (sin verificar)") : "No"} />
      <Dato l="Alta de socio" v={r.estado_alta_socio} />
      <Dato l="Semanas pedidas" v={(r.semanas_solicitadas || []).join(", ")} />
      <Dato l="Inscrito el" v={fecha(r.created_date)} />
      <Dato l="Consentimientos" v={`Datos: ${r.consentimiento_datos ? "Sí" : "No"} · Imagen: ${r.consentimiento_imagen ? "Sí" : "No"}`} />
      {r.notas && <div className="col-span-2 sm:col-span-3 xl:col-span-6"><Dato l="Notas" v={r.notas} /></div>}
    </div>
  );
}