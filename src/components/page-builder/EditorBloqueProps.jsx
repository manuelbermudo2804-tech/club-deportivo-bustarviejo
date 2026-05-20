import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import ImageUploadInput from "./ImageUploadInput";
import GalleryUploader from "./GalleryUploader";
import RichTextEditor from "./RichTextEditor";

// Editor de propiedades de un bloque concreto, según su tipo.
export default function EditorBloqueProps({ bloque, onChange }) {
  const datos = bloque.datos || {};
  const update = (k, v) => onChange({ ...bloque, datos: { ...datos, [k]: v } });
  const updateItems = (items) => update("items", items);

  // --- TEXTO ---
  if (bloque.tipo === "texto") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <div>
          <Label>Contenido</Label>
          <RichTextEditor
            value={datos.contenido || ""}
            onChange={(html) => update("contenido", html)}
            placeholder="Escribe aquí, o pega texto de Word/web y se formatea automáticamente…"
          />
          <p className="text-xs text-slate-500 mt-1">
            💡 Pega texto con listas (-, *, 1.) o **negritas** y se aplicará el formato automáticamente.
          </p>
        </div>
      </div>
    );
  }

  // --- STATS ---
  if (bloque.tipo === "stats") {
    const items = datos.items || [];
    return (
      <ListEditor
        items={items}
        onChange={updateItems}
        newItem={() => ({ numero: "100", etiqueta: "Etiqueta" })}
        fields={[
          { key: "numero", label: "Número", placeholder: "100" },
          { key: "etiqueta", label: "Etiqueta", placeholder: "Plazas" },
        ]}
      />
    );
  }

  // --- LISTA CON ICONOS ---
  if (bloque.tipo === "lista_iconos") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título de la sección</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <ListEditor
          items={items}
          onChange={updateItems}
          newItem={() => ({ icono: "✨", texto: "Nuevo beneficio" })}
          fields={[
            { key: "icono", label: "Emoji", placeholder: "🎁", className: "w-20" },
            { key: "texto", label: "Texto", placeholder: "Beneficio…" },
          ]}
        />
      </div>
    );
  }

  // --- FAQ ---
  if (bloque.tipo === "faq") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <ListEditor
          items={items}
          onChange={updateItems}
          newItem={() => ({ pregunta: "Nueva pregunta", respuesta: "Respuesta…" })}
          fields={[
            { key: "pregunta", label: "Pregunta" },
            { key: "respuesta", label: "Respuesta", textarea: true },
          ]}
        />
      </div>
    );
  }

  // --- GALERÍA ---
  if (bloque.tipo === "galeria") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título (opcional)</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <Label>Imágenes</Label>
        <GalleryUploader items={items} onChange={updateItems} />
      </div>
    );
  }

  // --- IMAGEN ---
  if (bloque.tipo === "imagen") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Imagen</Label>
          <ImageUploadInput value={datos.url} onChange={(v) => update("url", v)} />
        </div>
        <div>
          <Label>Texto alternativo</Label>
          <Input value={datos.alt || ""} onChange={(e) => update("alt", e.target.value)} placeholder="Descripción" />
        </div>
        <div>
          <Label>Pie de foto (opcional)</Label>
          <Input value={datos.pie || ""} onChange={(e) => update("pie", e.target.value)} />
        </div>
      </div>
    );
  }

  // --- VIDEO ---
  if (bloque.tipo === "video") {
    return (
      <div className="space-y-3">
        <div>
          <Label>URL de embed (YouTube o Vimeo)</Label>
          <Input
            value={datos.url || ""}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://www.youtube.com/embed/..."
          />
          <p className="text-xs text-slate-500 mt-1">
            En YouTube: Compartir → Insertar → copia el src del iframe.
          </p>
        </div>
      </div>
    );
  }

  // --- MAPA ---
  if (bloque.tipo === "mapa") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Cómo llegar" />
        </div>
        <div>
          <Label>Dirección visible</Label>
          <Input value={datos.direccion || ""} onChange={(e) => update("direccion", e.target.value)} placeholder="Calle..." />
        </div>
        <div>
          <Label>URL o iframe completo de Google Maps</Label>
          <Textarea
            value={datos.embed_url || ""}
            onChange={(e) => {
              const raw = e.target.value;
              // Si pegan el iframe completo, extraer automáticamente el src
              const match = raw.match(/src=["']([^"']+)["']/i);
              update("embed_url", match ? match[1] : raw);
            }}
            placeholder='Pega aquí el <iframe src="..."> o solo la URL https://www.google.com/maps/embed?...'
            rows={3}
            className="text-sm font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            En Google Maps: Compartir → Insertar mapa → pega el código entero o solo el src. Se detecta automáticamente. ✅
          </p>
        </div>
      </div>
    );
  }

  // --- CONTACTO ---
  if (bloque.tipo === "contacto") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Contáctanos" />
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Input value={datos.subtitulo || ""} onChange={(e) => update("subtitulo", e.target.value)} placeholder="Estamos aquí para ayudarte" />
        </div>
        <div>
          <Label>📞 Teléfono</Label>
          <Input value={datos.telefono || ""} onChange={(e) => update("telefono", e.target.value)} placeholder="+34 600 000 000" />
        </div>
        <div>
          <Label>📧 Email</Label>
          <Input value={datos.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="contacto@ejemplo.com" />
        </div>
        <div>
          <Label>💬 WhatsApp (con prefijo, sin espacios)</Label>
          <Input value={datos.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} placeholder="34600000000" />
        </div>
        <div>
          <Label>📍 Dirección</Label>
          <Input value={datos.direccion || ""} onChange={(e) => update("direccion", e.target.value)} placeholder="Calle, número, ciudad" />
        </div>
        <div>
          <Label>🕐 Horario (opcional)</Label>
          <Input value={datos.horario || ""} onChange={(e) => update("horario", e.target.value)} placeholder="L-V 9:00 - 20:00" />
        </div>
        <p className="text-xs text-slate-500">Deja en blanco los campos que no quieras mostrar.</p>
      </div>
    );
  }

  // --- TESTIMONIOS ---
  if (bloque.tipo === "testimonios") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <ListEditor
          items={items}
          onChange={updateItems}
          newItem={() => ({ texto: "", nombre: "", rol: "", avatar: "" })}
          fields={[
            { key: "texto", label: "Testimonio", textarea: true },
            { key: "nombre", label: "Nombre" },
            { key: "rol", label: "Rol (Socio, Padre…)" },
            { key: "avatar", label: "URL foto (opcional)" },
          ]}
        />
      </div>
    );
  }

  // --- TABLA DE PRECIOS ---
  if (bloque.tipo === "tabla_precios") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <div className="space-y-2">
          {items.map((p, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={p.nombre || ""}
                  onChange={(e) => {
                    const next = [...items]; next[idx] = { ...p, nombre: e.target.value }; updateItems(next);
                  }}
                  placeholder="Nombre del plan"
                />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={p.precio || ""}
                  onChange={(e) => { const n = [...items]; n[idx] = { ...p, precio: e.target.value }; updateItems(n); }}
                  placeholder="30€"
                />
                <Input
                  value={p.unidad || ""}
                  onChange={(e) => { const n = [...items]; n[idx] = { ...p, unidad: e.target.value }; updateItems(n); }}
                  placeholder="/mes"
                />
              </div>
              <Input
                value={p.descripcion || ""}
                onChange={(e) => { const n = [...items]; n[idx] = { ...p, descripcion: e.target.value }; updateItems(n); }}
                placeholder="Descripción breve"
              />
              <Textarea
                value={(p.features || []).join("\n")}
                onChange={(e) => {
                  const n = [...items];
                  n[idx] = { ...p, features: e.target.value.split("\n").filter(Boolean) };
                  updateItems(n);
                }}
                placeholder="Feature 1&#10;Feature 2"
                rows={3}
              />
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={!!p.destacado}
                  onCheckedChange={(v) => { const n = [...items]; n[idx] = { ...p, destacado: v }; updateItems(n); }}
                />
                ⭐ Destacar este plan (POPULAR)
              </label>
            </div>
          ))}
          <Button
            variant="outline" size="sm" onClick={() => updateItems([...items, { nombre: "Nuevo plan", precio: "0€", features: [], destacado: false }])}
            className="w-full gap-1"
          >
            <Plus className="w-3 h-3" /> Añadir plan
          </Button>
        </div>
      </div>
    );
  }

  // --- CTA BUTTON ---
  if (bloque.tipo === "cta_button") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Texto del botón</Label>
          <Input value={datos.texto || ""} onChange={(e) => update("texto", e.target.value)} />
        </div>
        <div>
          <Label>URL (déjalo en #formulario para ir al form)</Label>
          <Input value={datos.url || ""} onChange={(e) => update("url", e.target.value)} placeholder="#formulario" />
        </div>
      </div>
    );
  }

  // --- DIVISOR ---
  if (bloque.tipo === "divisor") {
    return <p className="text-sm text-slate-500">Sin opciones. Solo es una línea separadora.</p>;
  }

  // --- COUNTDOWN ---
  if (bloque.tipo === "countdown") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Faltan…" />
        </div>
        <div>
          <Label>Fecha y hora objetivo</Label>
          <Input
            type="datetime-local"
            value={datos.fecha || ""}
            onChange={(e) => update("fecha", e.target.value)}
          />
        </div>
        <div>
          <Label>Mensaje cuando termine</Label>
          <Input value={datos.mensaje_fin || ""} onChange={(e) => update("mensaje_fin", e.target.value)} placeholder="¡Ha llegado!" />
        </div>
      </div>
    );
  }

  // --- SPONSORS ---
  if (bloque.tipo === "sponsors") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Con el apoyo de" />
        </div>
        <div className="space-y-2">
          {items.map((sp, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={sp.nombre || ""}
                  onChange={(e) => { const n = [...items]; n[idx] = { ...sp, nombre: e.target.value }; updateItems(n); }}
                  placeholder="Nombre del patrocinador"
                />
                <Button variant="ghost" size="icon" onClick={() => updateItems(items.filter((_, i) => i !== idx))} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <ImageUploadInput
                value={sp.logo_url}
                onChange={(v) => { const n = [...items]; n[idx] = { ...sp, logo_url: v }; updateItems(n); }}
              />
              <Input
                value={sp.url || ""}
                onChange={(e) => { const n = [...items]; n[idx] = { ...sp, url: e.target.value }; updateItems(n); }}
                placeholder="URL de su web (opcional)"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateItems([...items, { nombre: "", logo_url: "", url: "" }])} className="w-full gap-1">
            <Plus className="w-3 h-3" /> Añadir patrocinador
          </Button>
        </div>
      </div>
    );
  }

  // --- EQUIPOS ---
  if (bloque.tipo === "equipos") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Equipos participantes" />
        </div>
        <div className="space-y-2">
          {items.map((eq, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={eq.nombre || ""}
                  onChange={(e) => { const n = [...items]; n[idx] = { ...eq, nombre: e.target.value }; updateItems(n); }}
                  placeholder="Nombre del equipo"
                />
                <Button variant="ghost" size="icon" onClick={() => updateItems(items.filter((_, i) => i !== idx))} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <ImageUploadInput
                value={eq.logo_url}
                onChange={(v) => { const n = [...items]; n[idx] = { ...eq, logo_url: v }; updateItems(n); }}
              />
              <Input
                value={eq.categoria || ""}
                onChange={(e) => { const n = [...items]; n[idx] = { ...eq, categoria: e.target.value }; updateItems(n); }}
                placeholder="Categoría / Grupo (opcional)"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateItems([...items, { nombre: "", logo_url: "", categoria: "" }])} className="w-full gap-1">
            <Plus className="w-3 h-3" /> Añadir equipo
          </Button>
        </div>
      </div>
    );
  }

  // --- HORARIOS ---
  if (bloque.tipo === "horarios") {
    const items = datos.items || [];
    return (
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Programa" />
        </div>
        <ListEditor
          items={items}
          onChange={updateItems}
          newItem={() => ({ hora: "", titulo: "", descripcion: "" })}
          fields={[
            { key: "hora", label: "Hora", placeholder: "10:00", className: "w-32" },
            { key: "titulo", label: "Título" },
            { key: "descripcion", label: "Descripción", textarea: true },
          ]}
        />
      </div>
    );
  }

  // --- EMBED ---
  if (bloque.tipo === "embed") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Título (opcional)</Label>
          <Input value={datos.titulo || ""} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <div>
          <Label>Código HTML / iframe</Label>
          <Textarea
            value={datos.html || ""}
            onChange={(e) => update("html", e.target.value)}
            rows={6}
            className="font-mono text-xs"
            placeholder='<iframe src="..." width="100%" height="400"></iframe>'
          />
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ Solo pega código de fuentes en las que confíes. El HTML se renderiza tal cual.
          </p>
        </div>
        <div>
          <Label>Altura mínima (px)</Label>
          <Input
            type="number"
            value={datos.altura ?? 400}
            onChange={(e) => update("altura", parseInt(e.target.value) || 400)}
          />
        </div>
      </div>
    );
  }

  return <p className="text-sm text-slate-500">Tipo de bloque no soportado.</p>;
}

// Editor genérico de listas con campos repetibles.
function ListEditor({ items, onChange, fields, newItem }) {
  const update = (idx, key, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, newItem()]);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {fields.map((f) => (
                <div key={f.key} className={f.className || ""}>
                  {f.textarea ? (
                    <Textarea
                      value={item[f.key] || ""}
                      onChange={(e) => update(idx, f.key, e.target.value)}
                      placeholder={f.placeholder || f.label}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <Input
                      value={item[f.key] || ""}
                      onChange={(e) => update(idx, f.key, e.target.value)}
                      placeholder={f.placeholder || f.label}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(idx)} className="text-red-500 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full gap-1">
        <Plus className="w-3 h-3" /> Añadir
      </Button>
    </div>
  );
}