import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, FlaskConical, Heart, ArrowLeft } from "lucide-react";

/**
 * PAGO POR ADELANTADO EN LA INSCRIPCIÓN
 *
 * Pantalla que se muestra DESPUÉS de elegir la categoría y ANTES de seguir con el formulario,
 * solo si la categoría tiene activado el pago por adelantado.
 * No cambia los pasos del formulario: se monta encima y, al terminar, el formulario continúa igual que siempre.
 *
 * Todos los importes los calcula el servidor (función prepagoInscripcion); aquí solo se muestran.
 *
 * Props:
 *  - categoria, nombre, fechaNacimiento (YYYY-MM-DD), esAdulto
 *  - returnPath: página a la que vuelve Stripe ('/ParentPlayers' o '/PlayerDashboard')
 *  - returnPrepagoId: si se vuelve de Stripe, id del prepago cuyo pago hay que confirmar
 *  - onConfirmed(prepago): pago hecho (Stripe, ya pagado antes o salto de prueba) → continuar el formulario
 *  - onNotRequired(): esta categoría/usuario no exige pago adelantado → continuar sin hacer nada
 *  - onCancel(): volver a elegir otra categoría
 *  - onBeforeRedirect(): se llama justo antes de ir a Stripe (para guardar el borrador del formulario)
 */

const FN = "prepagoInscripcion";
const eur = (n) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const mensajeError = (e, porDefecto) =>
  e?.response?.data?.error || e?.data?.error || e?.message || porDefecto;

const invocar = async (payload) => {
  const res = await base44.functions.invoke(FN, payload);
  return res?.data || res;
};

// Marco visual común de todas las pantallas (componente puro, sin estado)
const Marco = ({ children, titulo, icono }) => (
  <Card className="mx-auto w-full max-w-2xl border-2 border-orange-200 shadow-lg">
    <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white">
      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
        {icono}
        {titulo}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>
  </Card>
);

export default function UpfrontPaymentGate({
  categoria,
  nombre = "",
  fechaNacimiento,
  esAdulto = false,
  returnPath = "/ParentPlayers",
  returnPrepagoId = null,
  onConfirmed,
  onNotRequired,
  onCancel,
  onBeforeRedirect,
}) {
  // fases: cargando | aviso | cuotas | pagado | bloqueado | confirmando | sin_confirmar | error
  const [fase, setFase] = useState(returnPrepagoId ? "confirmando" : "cargando");
  const [info, setInfo] = useState(null);
  const [modalidad, setModalidad] = useState("");
  const [aportacion, setAportacion] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);

  // Callbacks en una ref para que los efectos no se relancen cuando el padre se vuelve a renderizar
  const cb = useRef({});
  cb.current = { onConfirmed, onNotRequired, onCancel, onBeforeRedirect };
  const yaNotificado = useRef(false);

  const payloadBase = () => ({
    categoria,
    nombre,
    fecha_nacimiento: fechaNacimiento,
    adulto: esAdulto === true,
  });

  const cargarEstado = async (aport = 0) => {
    const data = await invocar({ action: "estado", ...payloadBase(), aportacion_solidaria: aport });
    return data;
  };

  // ---- Vuelta de Stripe: esperar a que el webhook confirme el pago ----
  useEffect(() => {
    if (!returnPrepagoId) return;
    let cancelado = false;
    (async () => {
      setFase("confirmando");
      for (let i = 0; i < 20 && !cancelado; i++) {
        try {
          const data = await invocar({ action: "consultar", prepago_id: returnPrepagoId });
          const p = data?.prepago;
          if (p && p.estado === "Pagado") {
            if (!cancelado && !yaNotificado.current) {
              yaNotificado.current = true;
              cb.current.onConfirmed?.(p);
            }
            return;
          }
        } catch (e) {
          console.warn("[UpfrontPaymentGate] consultando prepago:", e);
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelado) setFase("sin_confirmar");
    })();
    return () => {
      cancelado = true;
    };
  }, [returnPrepagoId, reintento]);

  // ---- Entrada normal: ¿esta categoría exige pago adelantado? ----
  useEffect(() => {
    if (returnPrepagoId) return;
    let cancelado = false;
    (async () => {
      setFase("cargando");
      setError("");
      try {
        const data = await cargarEstado(0);
        if (cancelado) return;
        if (data?.requerido === false) {
          if (!yaNotificado.current) {
            yaNotificado.current = true;
            cb.current.onNotRequired?.();
          }
          return;
        }
        setInfo(data);
        if (data?.prepago_pagado) setFase("pagado");
        else if (data?.bloqueo) setFase("bloqueado");
        else setFase("aviso");
      } catch (e) {
        if (!cancelado) {
          setError(mensajeError(e, "No se pudo comprobar el pago de esta categoría."));
          setFase("error");
        }
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, fechaNacimiento, esAdulto, returnPrepagoId, reintento]);

  const elegirAportacion = async (importe) => {
    setAportacion(importe);
    try {
      const data = await cargarEstado(importe);
      if (data?.planes) setInfo(data);
    } catch (e) {
      setError(mensajeError(e, "No se pudo recalcular el importe."));
    }
  };

  const pagar = async (saltar = false) => {
    if (!modalidad) return;
    if (!saltar && window.top !== window.self) {
      alert("Por seguridad, el pago con tarjeta solo funciona en la app publicada.");
      return;
    }
    setTrabajando(true);
    setError("");
    try {
      const data = await invocar({
        action: "checkout",
        ...payloadBase(),
        modalidad,
        aportacion_solidaria: aportacion,
        return_path: returnPath,
        origin: window.location.origin,
        saltar_pago: saltar === true,
      });
      if (data?.error) throw new Error(data.error);

      if (data?.ya_pagado || data?.saltado) {
        const r = await invocar({ action: "consultar", prepago_id: data.prepago_id });
        if (r?.prepago && !yaNotificado.current) {
          yaNotificado.current = true;
          cb.current.onConfirmed?.(r.prepago);
        }
        return;
      }
      if (data?.url) {
        cb.current.onBeforeRedirect?.();
        window.location.href = data.url;
        return;
      }
      throw new Error("No se pudo iniciar el pago con tarjeta.");
    } catch (e) {
      setError(mensajeError(e, "No se pudo iniciar el pago con tarjeta."));
    } finally {
      setTrabajando(false);
    }
  };

  const planElegido = info?.planes?.[modalidad] || null;
  const esAdmin = info?.es_admin === true;

  const avisoAdmin = esAdmin ? (
      <Alert className="border-amber-300 bg-amber-50">
        <FlaskConical className="h-4 w-4 text-amber-700" />
        <AlertDescription className="text-xs text-amber-900">
          <strong>Modo administrador.</strong>{" "}
          {info?.modo_prueba
            ? "Esta categoría está en modo Prueba: las familias todavía no ven este paso."
            : "Este paso lo ven todas las familias."}{" "}
          Puedes saltarte el pago con tarjeta con el botón de prueba.
        </AlertDescription>
      </Alert>
  ) : null;

  // ---------- Pantallas ----------
  if (fase === "cargando") {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Comprobando la categoría…
      </div>
    );
  }

  if (fase === "confirmando") {
    return (
      <Marco titulo="Confirmando tu pago" icono={<Loader2 className="h-5 w-5 animate-spin text-orange-600" />}>
        <p className="text-sm text-slate-700">
          Estamos confirmando el pago con el banco. Tarda unos segundos, no cierres esta pantalla.
        </p>
      </Marco>
    );
  }

  if (fase === "sin_confirmar") {
    return (
      <Marco titulo="Todavía no vemos el pago" icono={<AlertTriangle className="h-5 w-5 text-amber-600" />}>
        <p className="text-sm text-slate-700">
          Aún no hemos recibido la confirmación. Si el pago se hizo correctamente, tu plaza queda reservada y recibirás
          un correo; no tendrás que volver a pagar. Puedes volver a comprobarlo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReintento((n) => n + 1)} className="bg-orange-600 hover:bg-orange-700">
            Comprobar de nuevo
          </Button>
        </div>
      </Marco>
    );
  }

  if (fase === "error") {
    return (
      <Marco titulo="No se pudo continuar" icono={<AlertTriangle className="h-5 w-5 text-red-600" />}>
        <p className="text-sm text-red-700">{error}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReintento((n) => n + 1)} className="bg-orange-600 hover:bg-orange-700">
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => cb.current.onCancel?.()}>
            Elegir otra categoría
          </Button>
        </div>
      </Marco>
    );
  }

  if (fase === "bloqueado") {
    return (
      <Marco titulo="No hay plaza disponible" icono={<AlertTriangle className="h-5 w-5 text-red-600" />}>
        <p className="text-sm text-slate-700">{info?.bloqueo}</p>
        <Button variant="outline" onClick={() => cb.current.onCancel?.()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Elegir otra categoría
        </Button>
      </Marco>
    );
  }

  if (fase === "pagado") {
    const p = info?.prepago_pagado;
    return (
      <Marco titulo="Pago ya realizado" icono={<CheckCircle2 className="h-5 w-5 text-green-600" />}>
        {avisoAdmin}
        <p className="text-sm text-slate-700">
          Ya tienes pagado el primer pago de <strong>{categoria}</strong>
          {p ? (
            <>
              {" "}
              ({eur(p.importe_primer_pago)} · {p.tipo_pago === "Único" ? "pago único" : "cuota de junio"})
            </>
          ) : null}
          . Tu plaza está reservada, no hace falta pagar de nuevo.
          {p?.es_prueba ? " (🧪 pago de prueba)" : ""}
        </p>
        <Button onClick={() => cb.current.onConfirmed?.(p)} className="bg-green-600 hover:bg-green-700">
          Continuar con la inscripción
        </Button>
      </Marco>
    );
  }

  if (fase === "aviso") {
    return (
      <Marco titulo="Esta categoría requiere pago por adelantado" icono={<ShieldCheck className="h-5 w-5 text-orange-600" />}>
        {avisoAdmin}
        <p className="text-sm text-slate-700">
          Para reservar plaza en <strong>{categoria}</strong> hay que pagar con tarjeta <strong>antes</strong> de rellenar
          el resto de la inscripción.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Si eliges <strong>pago único</strong>, pagas hoy toda la temporada.
          </li>
          <li>
            Si eliges <strong>tres plazos</strong>, pagas hoy la cuota de junio, que es la que reserva la plaza. Las otras dos
            se pagan más adelante, como siempre.
          </li>
          <li>Cuando el pago se confirme, seguirás con el formulario de inscripción.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setFase("cuotas")} className="bg-orange-600 hover:bg-orange-700">
            Entiendo, continuar
          </Button>
          <Button variant="outline" onClick={() => cb.current.onCancel?.()}>
            Elegir otra categoría
          </Button>
        </div>
      </Marco>
    );
  }

  // fase === "cuotas"
  const unico = info?.planes?.["Único"];
  const tres = info?.planes?.["Tres meses"];
  const fondo = info?.fondo;
  const descuento = Number(info?.descuento_hermano) || 0;

  const renderOpcion = ({ valor, titulo, importeAhora, detalle }) => {
    const activo = modalidad === valor;
    return (
      <button
        key={valor}
        type="button"
        onClick={() => setModalidad(valor)}
        className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
          activo ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-orange-300"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900">{titulo}</p>
            <p className="mt-0.5 text-xs text-slate-600">{detalle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Pagas hoy</p>
            <p className="text-lg font-bold text-orange-700">{eur(importeAhora)}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Marco titulo={`Pago por adelantado · ${categoria}`} icono={<CreditCard className="h-5 w-5 text-orange-600" />}>
      {avisoAdmin}

      {descuento > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-xs text-green-800">
            Incluye el descuento por hermano: −{eur(descuento)}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {unico &&
          renderOpcion({
            valor: "Único",
            titulo: "Pago único",
            importeAhora: unico.importe_primer_pago,
            detalle: "Pagas ahora toda la temporada y no tienes más cuotas.",
          })}
        {tres &&
          renderOpcion({
            valor: "Tres meses",
            titulo: "Tres plazos",
            importeAhora: tres.importe_primer_pago,
            detalle: `Hoy la cuota de junio. Después: septiembre ${eur(tres.pagos?.[1]?.cantidad)} y diciembre ${eur(
              tres.pagos?.[2]?.cantidad
            )}.`,
          })}
      </div>

      {fondo?.activo && (
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
          <p className="flex items-center gap-1 text-sm font-bold text-pink-900">
            <Heart className="h-4 w-4" /> {fondo.titulo || "Fondo Solidario de Becas"}
          </p>
          {fondo.texto && <p className="mt-1 text-xs text-pink-900/80">{fondo.texto}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, ...(fondo.importes || [])].map((imp) => (
              <button
                key={imp}
                type="button"
                onClick={() => elegirAportacion(imp)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  aportacion === imp
                    ? "border-pink-600 bg-pink-600 text-white"
                    : "border-pink-300 bg-white text-pink-800 hover:bg-pink-100"
                }`}
              >
                {imp === 0 ? "No, gracias" : eur(imp)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!modalidad || trabajando}
          onClick={() => pagar(false)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {trabajando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          {planElegido ? `Pagar ${eur(planElegido.importe_primer_pago)} con tarjeta` : "Elige una opción de pago"}
        </Button>
        <Button variant="outline" disabled={trabajando} onClick={() => setFase("aviso")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>
      </div>

      {esAdmin && (
        <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3">
          <p className="mb-2 text-xs text-amber-900">
            Solo administradores: continúa la inscripción sin pasar por Stripe. Queda marcado como prueba (sin cobro real).
          </p>
          <Button
            variant="outline"
            disabled={!modalidad || trabajando}
            onClick={() => pagar(true)}
            className="border-amber-500 text-amber-800 hover:bg-amber-100"
          >
            <FlaskConical className="mr-2 h-4 w-4" /> 🧪 Saltar pago (prueba)
          </Button>
        </div>
      )}
    </Marco>
  );
}
