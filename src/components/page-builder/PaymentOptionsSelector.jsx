import React from "react";
import { CreditCard, Minus, Plus, Check } from "lucide-react";

// Selector visual de opciones de pago + cantidad. Devuelve la opción y cantidad elegida.
export default function PaymentOptionsSelector({
  opciones = [],
  selectedId,
  cantidad = 1,
  onSelect,
  onCantidadChange,
  color = "#ea580c",
  colorSec = "#15803d",
}) {
  if (!opciones.length) return null;

  const selected = opciones.find((o) => o.id === selectedId);
  const total = selected ? Number((selected.precio * cantidad).toFixed(2)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-800 font-bold">
        <CreditCard className="w-5 h-5" style={{ color }} />
        <span>Elige tu opción</span>
      </div>

      <div className="space-y-2">
        {opciones.map((op) => {
          const isSel = op.id === selectedId;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => onSelect(op.id)}
              className="w-full text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md"
              style={{
                borderColor: isSel ? color : "#e2e8f0",
                background: isSel ? `${color}08` : "#fff",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{
                    borderColor: isSel ? color : "#cbd5e1",
                    background: isSel ? color : "#fff",
                  }}
                >
                  {isSel && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-bold text-slate-900">{op.nombre}</div>
                    <div className="text-xl font-black" style={{ color }}>
                      {op.precio?.toFixed(2)} €
                    </div>
                  </div>
                  {op.descripcion && (
                    <div className="text-sm text-slate-600 mt-1">{op.descripcion}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selector de cantidad */}
      {selected?.permitir_cantidad && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <div className="font-semibold text-slate-800">Cantidad</div>
            <div className="text-xs text-slate-500">Hasta {selected.cantidad_max || 10}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onCantidadChange(Math.max(1, cantidad - 1))}
              disabled={cantidad <= 1}
              className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xl font-black text-slate-900 w-10 text-center">{cantidad}</span>
            <button
              type="button"
              onClick={() => onCantidadChange(Math.min(selected.cantidad_max || 10, cantidad + 1))}
              disabled={cantidad >= (selected.cantidad_max || 10)}
              className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Total */}
      {selected && (
        <div
          className="p-4 rounded-2xl text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${colorSec})` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Total a pagar</div>
              <div className="text-xs opacity-75 mt-0.5">Pago seguro con tarjeta · Stripe</div>
            </div>
            <div className="text-3xl font-black">{total.toFixed(2)} €</div>
          </div>
        </div>
      )}
    </div>
  );
}