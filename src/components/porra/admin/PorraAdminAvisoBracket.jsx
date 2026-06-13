import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, AlertCircle, Search, CheckCircle2, Copy, Pencil, Save, X, Mail, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// URL base pública de la app
const APP_BASE = 'https://app.cdbustarviejo.com';

/**
 * Panel admin: envía un WhatsApp a cada participante pagado con los enlaces a
 * sus porras (acumula todas las que tenga si comparte teléfono) para que
 * revise el bracket actualizado al formato oficial FIFA 2026 antes del 28/06.
 *
 * - Filtra solo participantes con estado_pago === 'pagado' Y teléfono.
 * - Agrupa por teléfono normalizado (varias porras = un solo WhatsApp).
 * - Excluye automáticamente los que ya hayan re-editado el bracket.
 */
export default function PorraAdminAvisoBracket({ participantes, onRefresh }) {
  const [busqueda, setBusqueda] = useState('');
  // Edición inline del teléfono: { [participanteId]: 'valor en input' }
  const [editandoTel, setEditandoTel] = useState({});
  const [guardandoId, setGuardandoId] = useState(null);
  const [enviandoEmails, setEnviandoEmails] = useState(false);

  const empezarEditar = (p) => setEditandoTel(prev => ({ ...prev, [p.id]: p.telefono || '' }));
  const cancelarEditar = (id) => setEditandoTel(prev => { const n = { ...prev }; delete n[id]; return n; });
  const guardarTelefono = async (p) => {
    const nuevoTel = (editandoTel[p.id] || '').trim();
    if (!nuevoTel) { toast.error('El teléfono no puede estar vacío'); return; }
    setGuardandoId(p.id);
    try {
      await base44.entities.PorraParticipante.update(p.id, { telefono: nuevoTel });
      toast.success(`Teléfono actualizado para "${p.alias_equipo}"`);
      cancelarEditar(p.id);
      if (typeof onRefresh === 'function') await onRefresh();
    } catch (e) {
      toast.error('Error al guardar el teléfono');
    } finally {
      setGuardandoId(null);
    }
  };
  // Estado persistente en localStorage: una vez marcado como enviado, NO se desmarca
  // al refrescar. Guardamos por ID de porra (inmutable) para que un cambio de teléfono
  // o de agrupación no haga "desaparecer" los avisos ya enviados.
  // Migra automáticamente desde la versión anterior (que guardaba por teléfono).
  const STORAGE_KEY = 'porra_aviso_bracket_enviados_v2';
  const STORAGE_KEY_OLD = 'porra_aviso_bracket_enviados_v1';
  const [enviadosPorraIds, setEnviadosPorraIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...enviadosPorraIds]));
    } catch {}
  }, [enviadosPorraIds]);

  // Migración una sola vez: si había datos en v1 (claves = teléfonos), los convertimos
  // a IDs de porra usando los participantes actuales.
  useEffect(() => {
    try {
      const rawOld = localStorage.getItem(STORAGE_KEY_OLD);
      if (!rawOld) return;
      const oldTels = new Set(JSON.parse(rawOld));
      if (oldTels.size === 0) { localStorage.removeItem(STORAGE_KEY_OLD); return; }
      const idsMigrados = new Set(enviadosPorraIds);
      participantes.forEach(p => {
        const tel = normalizarTelefono(p.telefono);
        if (tel && oldTels.has(tel)) idsMigrados.add(p.id);
      });
      setEnviadosPorraIds(idsMigrados);
      localStorage.removeItem(STORAGE_KEY_OLD);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantes.length]);

  // Normaliza teléfono: solo dígitos, añade +34 si es número español de 9 dígitos
  const normalizarTelefono = (tel) => {
    if (!tel) return null;
    let limpio = String(tel).replace(/[^\d+]/g, '');
    if (limpio.startsWith('+')) {
      limpio = '+' + limpio.slice(1).replace(/\D/g, '');
    } else {
      limpio = limpio.replace(/\D/g, '');
      if (limpio.length === 9) limpio = '+34' + limpio;
      else if (limpio.length === 11 && limpio.startsWith('34')) limpio = '+' + limpio;
      else if (!limpio.startsWith('+')) limpio = '+' + limpio;
    }
    return limpio;
  };

  // Normaliza nombre para comparar (sin tildes, lowercase, sin espacios extra)
  const normalizarNombre = (n) => {
    if (!n) return '';
    return String(n)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  };

  // Agrupar por teléfono normalizado.
  // PASO 1: indexamos qué teléfono está asociado a cada email Y a cada nombre normalizado.
  // PASO 2: si una porra no tiene tel propio, lo heredamos desde otra porra del mismo email
  //         o, en su defecto, del mismo nombre (útil cuando el email difiere pero es la misma persona).
  // Así, si Sergio Baonza tiene 2 porras y solo una trae bien el tel, las 2 acaban en el mismo WhatsApp.
  const grupos = useMemo(() => {
    const pagadosPendientes = participantes.filter(
      p => p.estado_pago === 'pagado' && !p.bracket_reeditado
    );

    const emailToTel = new Map();
    const nombreToTel = new Map();
    pagadosPendientes.forEach(p => {
      const tel = normalizarTelefono(p.telefono);
      if (!tel) return;
      const email = (p.email || '').toLowerCase().trim();
      const nombre = normalizarNombre(p.nombre);
      if (email && !emailToTel.has(email)) emailToTel.set(email, tel);
      if (nombre && !nombreToTel.has(nombre)) nombreToTel.set(nombre, tel);
    });

    const map = new Map();
    pagadosPendientes.forEach(p => {
      const email = (p.email || '').toLowerCase().trim();
      const nombre = normalizarNombre(p.nombre);
      // Fallback en cascada: tel propio -> tel de otra porra con mismo email -> tel de otra porra con mismo nombre
      const tel = normalizarTelefono(p.telefono)
        || emailToTel.get(email)
        || nombreToTel.get(nombre)
        || null;
      if (!tel) return;
      if (!map.has(tel)) {
        map.set(tel, { telefono: tel, nombre: p.nombre, porras: [] });
      }
      map.get(tel).porras.push({
        id: p.id,
        alias: p.alias_equipo,
        token: p.token_acceso,
        nombre: p.nombre,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [participantes]);

  // Estadísticas
  const totalPagados = participantes.filter(p => p.estado_pago === 'pagado').length;
  const yaReeditaron = participantes.filter(p => p.estado_pago === 'pagado' && p.bracket_reeditado).length;
  // "Sin teléfono" = porras pagadas pendientes cuyo dueño no aparece en ningún grupo
  // (ni con tel propio ni con tel heredado de otra porra del mismo email).
  const idsConGrupo = new Set();
  grupos.forEach(g => g.porras.forEach(p => idsConGrupo.add(p.id)));
  const participantesSinTel = participantes.filter(
    p => p.estado_pago === 'pagado' && !p.bracket_reeditado && !idsConGrupo.has(p.id)
  ).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  const sinTelefono = participantesSinTel.length;

  const filtrados = grupos.filter(g => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return g.nombre.toLowerCase().includes(q) ||
      g.telefono.includes(q) ||
      g.porras.some(p => p.alias.toLowerCase().includes(q));
  });

  // Construye el mensaje WhatsApp para un grupo
  const construirMensaje = (grupo) => {
    const linksPorras = grupo.porras
      .map(p => `🔗 "${p.alias}": ${APP_BASE}/PorraMiPorra?token=${p.token}`)
      .join('\n');

    const intro = grupo.porras.length === 1
      ? `Hemos actualizado tu porra del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).`
      : `Hemos actualizado tus ${grupo.porras.length} porras del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).`;

    return `¡Hola ${grupo.nombre.split(' ')[0]}! 👋

Perdona las molestias 🙏 ${intro}

🔒 La fase de grupos, mejores terceros y predicciones especiales *ya están bloqueadas* (el Mundial ha empezado).

⚠️ Lo único que aún puedes ajustar es el *bracket de eliminatorias*, y tienes hasta el *domingo 28 de junio a las 18:00h* (luego se cierra para todo el mundo).

${linksPorras}

👉 Entra en el enlace, repasa las eliminatorias y pulsa *"Confirmar y cerrar bracket"*. Si no lo haces antes del 28/06 a las 18:00, tu porra se quedará con las predicciones que tengas en ese momento.

¡Gracias por tu paciencia y mucha suerte! 🏆⚽

— CD Bustarviejo`;
  };

  // Un grupo se considera "enviado" si TODAS sus porras están marcadas como enviadas
  const grupoEnviado = (grupo) => grupo.porras.every(p => enviadosPorraIds.has(p.id));

  const abrirWhatsApp = (grupo) => {
    const mensaje = encodeURIComponent(construirMensaje(grupo));
    const tel = grupo.telefono.replace(/[^\d]/g, '');
    const url = `https://wa.me/${tel}?text=${mensaje}`;
    window.open(url, '_blank');
    // Marcar como enviado por ID de porra (inmutable, resistente a cambios de tel)
    setEnviadosPorraIds(prev => {
      const next = new Set(prev);
      grupo.porras.forEach(p => next.add(p.id));
      return next;
    });
  };

  const copiarMensaje = (grupo) => {
    navigator.clipboard.writeText(construirMensaje(grupo));
    toast.success('Mensaje copiado al portapapeles');
  };

  // Descarga una vCard (.vcf) para guardar el contacto en la agenda del móvil.
  // Al abrirla, el sistema operativo pregunta si guardar el contacto.
  const descargarVCard = (grupo) => {
    const nombre = grupo.nombre || 'Porra Mundial';
    const tel = grupo.telefono;
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${nombre} (Porra)`,
      `N:${nombre};;;;`,
      `TEL;TYPE=CELL:${tel}`,
      `ORG:Porra Mundial 2026 - CD Bustarviejo`,
      'END:VCARD',
    ].join('\n');
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Contacto descargado. Ábrelo para guardarlo en la agenda.');
  };

  // Cuenta cuántos participantes pagados quedan pendientes de re-editar (con email)
  const pendientesEmail = participantes.filter(
    p => p.estado_pago === 'pagado' && !p.bracket_reeditado && p.email && p.token_acceso
  );
  const destinatariosUnicos = new Set(pendientesEmail.map(p => String(p.email).toLowerCase().trim())).size;

  const enviarEmailMasivo = async () => {
    if (pendientesEmail.length === 0) {
      toast.info('No quedan porras pendientes de re-editar');
      return;
    }
    if (!confirm(`Vas a enviar un email a ${destinatariosUnicos} destinatarios únicos con el link a sus ${pendientesEmail.length} porras pendientes. ¿Continuar?`)) return;

    setEnviandoEmails(true);
    try {
      const res = await base44.functions.invoke('porraEnviarEmailReedicion', {});
      const data = res?.data || {};
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`📧 ${data.enviados || 0} emails enviados${data.fallidos ? ` · ${data.fallidos} fallidos` : ''}`);
      }
    } catch (e) {
      toast.error('Error al enviar emails: ' + (e?.message || e));
    } finally {
      setEnviandoEmails(false);
    }
  };

  const abrirTodosSinEnviar = () => {
    const pendientes = filtrados.filter(g => !grupoEnviado(g));
    if (pendientes.length === 0) {
      toast.info('No quedan pendientes');
      return;
    }
    if (pendientes.length > 10) {
      if (!confirm(`¿Abrir ${pendientes.length} ventanas de WhatsApp? El navegador puede bloquear algunas.`)) return;
    }
    pendientes.forEach((g, i) => {
      setTimeout(() => abrirWhatsApp(g), i * 600);
    });
  };

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <MessageCircle className="w-5 h-5" />
          Avisar a participantes — Re-edición del bracket
        </CardTitle>
        <p className="text-sm text-amber-800 mt-1">
          Envía un WhatsApp a cada participante pagado con los enlaces a sus porras
          para que revisen el bracket actualizado al formato FIFA 2026 antes del 28/06.
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-slate-900">{totalPagados}</div>
            <div className="text-xs text-slate-500">Pagados totales</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-green-700">{yaReeditaron}</div>
            <div className="text-xs text-green-600">Ya re-editaron ✅</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-amber-700">{grupos.length}</div>
            <div className="text-xs text-amber-600">A avisar (con tel.)</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-red-600">{sinTelefono}</div>
            <div className="text-xs text-red-500">Sin teléfono ⚠️</div>
          </div>
        </div>

        {/* Banner: enviar email masivo (alternativa a WhatsApp cuando está bloqueado) */}
        {pendientesEmail.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-blue-900">📧 Aviso por email (recomendado)</p>
                <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                  Envía un email a cada participante pendiente con sus enlaces personalizados.
                  Útil si WhatsApp está bloqueado o no tienes los teléfonos.
                  Llega a <strong>{destinatariosUnicos} destinatarios únicos</strong> ({pendientesEmail.length} porras pendientes).
                </p>
              </div>
            </div>
            <Button
              onClick={enviarEmailMasivo}
              disabled={enviandoEmails || pendientesEmail.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {enviandoEmails ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando emails…</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Enviar email a los {destinatariosUnicos} pendientes</>
              )}
            </Button>
          </div>
        )}

        {sinTelefono > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">
                Hay <strong>{sinTelefono}</strong> porras pagadas pendientes <strong>sin teléfono</strong>.
                Añade el teléfono aquí para poder agruparlas y enviar el WhatsApp.
              </p>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {participantesSinTel.map(p => {
                const editando = editandoTel[p.id] !== undefined;
                return (
                  <div key={p.id} className="bg-white rounded border border-red-200 p-2 flex items-center gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-slate-500 truncate">"{p.alias_equipo}" · {p.email}</p>
                    </div>
                    {editando ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editandoTel[p.id]}
                          onChange={(e) => setEditandoTel(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="606046828"
                          className="h-8 w-36 text-sm"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') guardarTelefono(p); if (e.key === 'Escape') cancelarEditar(p.id); }}
                        />
                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => guardarTelefono(p)} disabled={guardandoId === p.id}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => cancelarEditar(p.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 border-red-300 text-red-700" onClick={() => empezarEditar(p)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Añadir tel.
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buscador + botón masivo */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, teléfono o alias..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={abrirTodosSinEnviar}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={filtrados.length === 0}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Abrir todos ({filtrados.filter(g => !grupoEnviado(g)).length})
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              No hay participantes para avisar 🎉
            </p>
          ) : filtrados.map(grupo => {
            const enviado = grupoEnviado(grupo);
            return (
              <div
                key={grupo.telefono}
                className={`rounded-lg border-2 p-3 transition-all ${
                  enviado ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 truncate">{grupo.nombre}</p>
                      {enviado && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
                        </Badge>
                      )}
                      {grupo.porras.length > 1 && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {grupo.porras.length} porras
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {grupo.telefono}
                    </p>
                    <div className="mt-1.5 text-xs text-slate-600 space-y-1">
                      {grupo.porras.map(p => {
                        const participanteCompleto = participantes.find(x => x.id === p.id);
                        const editando = editandoTel[p.id] !== undefined;
                        return (
                          <div key={p.id} className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">• {p.alias}</span>
                            {editando ? (
                              <span className="inline-flex items-center gap-1">
                                <Input
                                  value={editandoTel[p.id]}
                                  onChange={(e) => setEditandoTel(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  placeholder="606046828"
                                  className="h-6 w-32 text-xs px-2"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') guardarTelefono(participanteCompleto); if (e.key === 'Escape') cancelarEditar(p.id); }}
                                />
                                <button onClick={() => guardarTelefono(participanteCompleto)} className="text-green-600 hover:text-green-700" disabled={guardandoId === p.id} title="Guardar">
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => cancelarEditar(p.id)} className="text-slate-500 hover:text-slate-700" title="Cancelar">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => empezarEditar(participanteCompleto)}
                                className="text-slate-400 hover:text-blue-600 inline-flex items-center"
                                title={`Editar teléfono (actual: ${participanteCompleto?.telefono || 'ninguno'})`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => descargarVCard(grupo)}
                      title="Guardar contacto en la agenda (.vcf)"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiarMensaje(grupo)}
                      title="Copiar mensaje"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => abrirWhatsApp(grupo)}
                      className={enviado ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      {enviado ? 'Re-enviar' : 'WhatsApp'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}