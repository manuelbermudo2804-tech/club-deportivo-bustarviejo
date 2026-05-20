import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import OpcionesEditor from "./OpcionesEditor";
import SubCamposEditor from "./SubCamposEditor";

const TIPOS_CAMPO = [
  { v: "texto", l: "📝 Texto" },
  { v: "email", l: "📧 Email" },
  { v: "telefono", l: "📞 Teléfono" },
  { v: "dni", l: "🆔 DNI (validado)" },
  { v: "iban", l: "🏦 IBAN (validado)" },
  { v: "fecha", l: "📅 Fecha" },
  { v: "numero", l: "🔢 Número" },
  { v: "select", l: "📋 Selector" },
  { v: "radio", l: "🔘 Opciones (radio)" },
  { v: "textarea", l: "📄 Texto largo" },
  { v: "checkbox", l: "☑️ Casilla" },
  { v: "aceptacion", l: "✅ Aceptación legal" },
  { v: "archivo", l: "📎 Subida de archivo" },
  { v: "lista_jugadores", l: "👥 Lista de jugadores (repetidor)" },
];

// Editor del formulario de la landing.
export default function EditorFormulario({ formulario, onChange }) {
  const update = (k, v) => onChange({ ...formulario, [k]: v });
  const campos = formulario?.campos || [];

  const addCampo = () => {
    const id = `campo_${Date.now()}`;
    update("campos", [...campos, {
      id, tipo: "texto", etiqueta: "Nuevo campo", requerido: false, ancho: "full"
    }]);
  };

  const updateCampo = (idx, k, v) => {
    const next = [...campos];
    next[idx] = { ...next[idx], [k]: v };
    update("campos", next);
  };

  const deleteCampo = (idx) => {
    update("campos", campos.filter((_, i) => i !== idx));
  };

  const moveCampo = (idx, dir) => {
    const next = [...campos];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update("campos", next);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 text-base mb-3">📋 Formulario</h3>

      <div>
        <Label>Título del formulario</Label>
        <Input
          value={formulario?.titulo || ""}
          onChange={(e) => update("titulo", e.target.value)}
          placeholder="Apúntate aquí"
        />
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea
          value={formulario?.descripcion || ""}
          onChange={(e) => update("descripcion", e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label>Texto del botón enviar</Label>
        <Input
          value={formulario?.cta_envio || ""}
          onChange={(e) => update("cta_envio", e.target.value)}
          placeholder="Inscribirme"
        />
      </div>

      <div>
        <Label>Mensaje al enviar correctamente</Label>
        <Textarea
          value={formulario?.mensaje_exito || ""}
          onChange={(e) => update("mensaje_exito", e.target.value)}
          rows={2}
          placeholder="¡Hemos recibido tu inscripción!"
        />
      </div>

      <div className="pt-3 border-t border-slate-200 space-y-3">
        <Label className="text-base font-bold flex items-center gap-2">📧 Emails automáticos (Resend)</Label>
        <p className="text-xs text-slate-500 -mt-2">
          Al recibir una inscripción se envía un correo de confirmación al inscrito. Opcionalmente puedes notificar a uno o más administradores.
        </p>
        <div>
          <Label className="text-xs">Asunto del email al inscrito</Label>
          <Input
            value={formulario?.email_confirmacion_asunto || ""}
            onChange={(e) => update("email_confirmacion_asunto", e.target.value)}
            placeholder="Confirmación de inscripción · CD Bustarviejo"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Mensaje personalizado en el email (opcional)</Label>
          <Textarea
            value={formulario?.email_confirmacion_texto || ""}
            onChange={(e) => update("email_confirmacion_texto", e.target.value)}
            rows={3}
            placeholder="Si lo dejas vacío se usa un mensaje genérico de confirmación."
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Notificar a admins (emails separados por coma)</Label>
          <Input
            value={formulario?.notificar_emails_admin || ""}
            onChange={(e) => update("notificar_emails_admin", e.target.value)}
            placeholder="info@cdbustarviejo.com, otro@cdbustarviejo.com"
            className="text-sm"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-bold">Campos del formulario ({campos.length})</Label>
          <Button size="sm" onClick={addCampo} className="gap-1">
            <Plus className="w-4 h-4" /> Añadir
          </Button>
        </div>

        <div className="space-y-3">
          {campos.map((c, idx) => (
            <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex flex-col">
                  <button onClick={() => moveCampo(idx, -1)} className="text-slate-400 hover:text-slate-700 text-xs" disabled={idx === 0}>▲</button>
                  <button onClick={() => moveCampo(idx, 1)} className="text-slate-400 hover:text-slate-700 text-xs" disabled={idx === campos.length - 1}>▼</button>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={c.etiqueta}
                    onChange={(e) => updateCampo(idx, "etiqueta", e.target.value)}
                    placeholder="Etiqueta"
                    className="text-sm"
                  />
                  <Select value={c.tipo} onValueChange={(v) => updateCampo(idx, "tipo", v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_CAMPO.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteCampo(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={c.ancho || "full"} onValueChange={(v) => updateCampo(idx, "ancho", v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Ancho completo</SelectItem>
                    <SelectItem value="half">Media columna</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!c.requerido}
                    onCheckedChange={(v) => updateCampo(idx, "requerido", v)}
                  />
                  Obligatorio
                </label>
              </div>

              {(c.tipo === "select" || c.tipo === "radio") && (
                <OpcionesEditor
                  opciones={c.opciones || []}
                  onChange={(v) => updateCampo(idx, "opciones", v)}
                />
              )}

              {c.tipo === "archivo" && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tipos permitidos</Label>
                      <Input
                        value={c.accept || ""}
                        onChange={(e) => updateCampo(idx, "accept", e.target.value)}
                        placeholder=".pdf,.jpg,.png"
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tamaño máx (MB)</Label>
                      <Input
                        type="number"
                        value={c.max_mb ?? 5}
                        onChange={(e) => updateCampo(idx, "max_mb", parseInt(e.target.value) || 5)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Visibilidad condicional */}
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                  🔀 Mostrar solo si… (condicional)
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 p-2 bg-white rounded border border-slate-200">
                  <Select
                    value={c.condicion_campo || ""}
                    onValueChange={(v) => updateCampo(idx, "condicion_campo", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="(siempre visible)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(siempre visible)</SelectItem>
                      {campos.filter((cc, i) => i < idx && cc.id !== c.id).map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>{cc.etiqueta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={c.condicion_valor || ""}
                    onChange={(e) => updateCampo(idx, "condicion_valor", e.target.value)}
                    placeholder="valor esperado"
                    className="text-xs h-8"
                    disabled={!c.condicion_campo}
                  />
                </div>
              </details>

              {c.tipo === "lista_jugadores" && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Mínimo</Label>
                      <Input
                        type="number"
                        min={1}
                        value={c.min ?? 1}
                        onChange={(e) => updateCampo(idx, "min", parseInt(e.target.value) || 1)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Máximo</Label>
                      <Input
                        type="number"
                        min={1}
                        value={c.max ?? 12}
                        onChange={(e) => updateCampo(idx, "max", parseInt(e.target.value) || 12)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    El que rellena verá un selector "Nº de jugadores" entre {c.min ?? 1} y {c.max ?? 12}. Al elegir el número aparecerán esos bloques.
                  </p>
                  <SubCamposEditor
                    subCampos={c.sub_campos || []}
                    onChange={(v) => updateCampo(idx, "sub_campos", v)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}