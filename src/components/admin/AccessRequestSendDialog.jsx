import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, UserPlus, XCircle, AlertCircle, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getWhatsAppUrl } from "./access-codes/whatsappCodeMessage";

/**
 * Diálogo para enviar el código a una solicitud pública.
 * Email y nombre vienen prerrellenados (no editables).
 * El admin solo elige el TIPO de invitación correcto.
 */
export default function AccessRequestSendDialog({ request, open, onOpenChange, onSent }) {
  const [tipo, setTipo] = useState("padre_nuevo");
  const [mensaje, setMensaje] = useState("");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedCategorias, setSelectedCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentResult, setSentResult] = useState(null); // {codigo, tipo, nombre}

  const needsPlayer = tipo === 'segundo_progenitor' || tipo === 'juvenil';
  const needsCategoria = tipo === 'entrenador' || tipo === 'coordinador';

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['playersForInvite'],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    enabled: open && needsPlayer,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categoriesForInvite'],
    queryFn: async () => {
      const cats = await base44.entities.CategoryConfig.filter({ activa: true });
      const seen = new Set();
      return cats.filter(c => {
        if (seen.has(c.nombre)) return false;
        seen.add(c.nombre);
        return true;
      });
    },
    enabled: open && needsCategoria,
  });

  // Reset al abrir/cerrar
  useEffect(() => {
    if (open) {
      setTipo("padre_nuevo");
      setMensaje("");
      setSearchPlayer("");
      setSelectedPlayer(null);
      setSelectedCategorias([]);
      setSentResult(null);
    }
  }, [open]);

  // Reset campos dependientes al cambiar tipo
  useEffect(() => {
    if (!needsPlayer) { setSelectedPlayer(null); setSearchPlayer(""); }
    if (!needsCategoria) setSelectedCategorias([]);
  }, [tipo]);

  const filteredPlayers = searchPlayer.trim().length >= 2
    ? allPlayers.filter(p =>
        p.nombre?.toLowerCase().includes(searchPlayer.toLowerCase()) ||
        p.email_padre?.toLowerCase().includes(searchPlayer.toLowerCase())
      ).slice(0, 10)
    : [];

  const toggleCategoria = (cat) => {
    setSelectedCategorias(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSend = async () => {
    if (!request) return;
    if (needsPlayer && !selectedPlayer) {
      toast.error("Selecciona el jugador al que vincular esta invitación");
      return;
    }
    if (needsCategoria && selectedCategorias.length === 0) {
      toast.error("Selecciona al menos una categoría");
      return;
    }

    setLoading(true);
    try {
      const { data: result } = await base44.functions.invoke('generateAccessCode', {
        email: request.email,
        nombre_destino: request.nombre_progenitor,
        tipo,
        mensaje_personalizado: mensaje.trim(),
        ...(selectedPlayer ? { jugador_id: selectedPlayer.id, jugador_nombre: selectedPlayer.nombre } : {}),
        ...(needsCategoria ? { categorias_asignadas: selectedCategorias } : {}),
      });
      toast.success(`Código ${result.codigo} enviado a ${request.email}`);
      setSentResult({ codigo: result.codigo, tipo, nombre: request.nombre_progenitor });
      onSent?.(result, request);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" />
            Enviar Código de Acceso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Datos de la solicitud (no editables) */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-bold text-orange-700 uppercase">📬 Solicitud recibida</p>
            <p className="text-sm font-bold text-slate-900">{request.nombre_progenitor}</p>
            <p className="text-xs text-slate-600">📧 {request.email}</p>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
              {request.categoria}
            </Badge>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Selecciona el <strong>tipo de invitación correcto</strong>. Si la familia es segundo progenitor o el solicitante es un jugador adulto/juvenil, no envíes "Padre Nuevo".
            </p>
          </div>

          {/* Tipo de invitación */}
          <div>
            <Label>Tipo de invitación *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="padre_nuevo">👨‍👩‍👧 Padre/Madre Nuevo</SelectItem>
                <SelectItem value="segundo_progenitor">👥 Segundo Progenitor</SelectItem>
                <SelectItem value="juvenil">⚽ Acceso Juvenil (+13)</SelectItem>
                <SelectItem value="jugador_adulto">🏃 Jugador +18</SelectItem>
                <SelectItem value="entrenador">🏃‍♂️ Entrenador</SelectItem>
                <SelectItem value="coordinador">📋 Coordinador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categorías (entrenador/coordinador) */}
          {needsCategoria && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">📋 Categorías asignadas *</Label>
              <p className="text-xs text-slate-500">
                Selecciona las categorías que {tipo === 'entrenador' ? 'entrenará' : 'coordinará'}
              </p>
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {allCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.nombre)}
                    className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2 ${
                      selectedCategorias.includes(cat.nombre)
                        ? 'bg-orange-50 border-l-4 border-l-orange-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                      selectedCategorias.includes(cat.nombre)
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'border-slate-300'
                    }`}>
                      {selectedCategorias.includes(cat.nombre) && '✓'}
                    </span>
                    <span className="font-medium text-sm">{cat.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jugador vinculado (segundo_progenitor / juvenil) */}
          {needsPlayer && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">⚽ Jugador vinculado *</Label>
              {selectedPlayer ? (
                <div className="flex items-center justify-between bg-green-50 border-2 border-green-300 rounded-lg p-3">
                  <div>
                    <p className="font-bold text-sm text-green-900">{selectedPlayer.nombre}</p>
                    <p className="text-xs text-green-700">
                      {selectedPlayer.categoria_principal || 'Sin categoría'} · Padre: {selectedPlayer.email_padre}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedPlayer(null); setSearchPlayer(""); }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={searchPlayer}
                    onChange={(e) => setSearchPlayer(e.target.value)}
                    placeholder="Busca por nombre del jugador o email del padre..."
                  />
                  {filteredPlayers.length > 0 && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                      {filteredPlayers.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedPlayer(p); setSearchPlayer(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors"
                        >
                          <p className="font-medium text-sm">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{p.categoria_principal} · {p.email_padre}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchPlayer.trim().length >= 2 && filteredPlayers.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">No se encontraron jugadores</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mensaje opcional */}
          <div>
            <Label>Mensaje personalizado (opcional)</Label>
            <Input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Bienvenido al club..."
            />
          </div>

          {!sentResult ? (
            <Button
              onClick={handleSend}
              disabled={loading || (needsPlayer && !selectedPlayer) || (needsCategoria && selectedCategorias.length === 0)}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Generar Código y Enviar Email
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-900">¡Código enviado por email!</p>
                <p className="text-sm font-mono text-green-700 mt-1">{sentResult.codigo}</p>
              </div>

              {request.telefono && (() => {
                const waUrl = getWhatsAppUrl(request.telefono, sentResult.tipo, sentResult.nombre, sentResult.codigo, request.email);
                if (!waUrl) return null;
                return (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" type="button">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {request.prefiere_whatsapp ? '📲 Enviar también por WhatsApp (lo pidió)' : '📲 Enviar también por WhatsApp'}
                    </Button>
                  </a>
                );
              })()}

              {request.prefiere_whatsapp && !request.telefono && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 text-center">
                  ⚠️ Pidió WhatsApp pero no dejó teléfono
                </p>
              )}

              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}