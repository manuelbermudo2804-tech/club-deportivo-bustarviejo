import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap, Copy, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BulkInviteDialog({ open, onOpenChange, onBulkGenerate, existingCodes }) {
  const [rawEmails, setRawEmails] = useState("");
  const [tipo, setTipo] = useState("padre_nuevo");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [source, setSource] = useState("manual"); // manual | players

  const { data: players = [] } = useQuery({
    queryKey: ['playersForBulk'],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    enabled: open,
  });

  // Extract unique email_padre from players
  const playerEmails = useMemo(() => {
    const emailSet = new Set();
    players.forEach(p => {
      const e = (p.email_padre || '').trim().toLowerCase();
      if (e && e.includes('@')) emailSet.add(e);
    });
    return [...emailSet].sort();
  }, [players]);

  // Already have a code (pending or used)
  const existingEmailSet = useMemo(() => {
    const set = new Set();
    (existingCodes || []).forEach(c => {
      if (c.estado === 'pendiente' || c.estado === 'usado') {
        set.add(c.email?.toLowerCase());
      }
    });
    return set;
  }, [existingCodes]);

  // Parse emails from textarea
  const parsedEmails = useMemo(() => {
    if (!rawEmails.trim()) return [];
    // Split by newlines, commas, semicolons, spaces
    return rawEmails
      .split(/[\n,;\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@'));
  }, [rawEmails]);

  const uniqueEmails = useMemo(() => [...new Set(parsedEmails)], [parsedEmails]);
  const newEmails = useMemo(() => uniqueEmails.filter(e => !existingEmailSet.has(e)), [uniqueEmails, existingEmailSet]);
  const alreadyHaveCode = useMemo(() => uniqueEmails.filter(e => existingEmailSet.has(e)), [uniqueEmails, existingEmailSet]);

  const handleLoadFromPlayers = () => {
    // Only load emails that DON'T already have a code
    const emailsToLoad = playerEmails.filter(e => !existingEmailSet.has(e));
    setRawEmails(emailsToLoad.join('\n'));
    toast.success(`${emailsToLoad.length} emails cargados (${playerEmails.length - emailsToLoad.length} ya tienen código)`);
  };

  const handleCopyEmails = () => {
    navigator.clipboard.writeText(playerEmails.join('\n'));
    toast.success(`${playerEmails.length} emails copiados al portapapeles`);
  };

  const handleSubmit = async () => {
    if (newEmails.length === 0) {
      toast.error('No hay emails nuevos para enviar');
      return;
    }
    if (!confirm(`¿Generar y enviar ${newEmails.length} códigos de acceso? Esto puede tardar unos minutos.`)) return;
    
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateAccessCode', {
        action: 'bulk',
        emails: newEmails.map(e => ({ email: e })),
        tipo,
      });
      setResults(data);
      toast.success(`✅ ${data.sent} códigos generados y enviados`);
      onBulkGenerate();
    } catch (err) {
      toast.error('Error: ' + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setResults(null);
      setRawEmails("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Generación Masiva de Códigos
          </DialogTitle>
        </DialogHeader>

        {results ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-green-800">
                ✅ {results.sent} códigos enviados de {results.total}
              </p>
              {results.errors > 0 && (
                <p className="text-sm text-red-600 mt-1">⚠️ {results.errors} errores</p>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.results?.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="truncate flex-1">{r.email}</span>
                  {r.success ? (
                    <Badge className="bg-green-100 text-green-800 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {r.reenvio ? 'Reenviado' : r.codigo}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 text-[10px]">
                      <XCircle className="w-3 h-3 mr-1" />
                      {r.error}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="bg-orange-600 hover:bg-orange-700">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Source selector */}
            <div className="flex gap-2">
              <Button
                variant={source === 'players' ? 'default' : 'outline'}
                onClick={() => setSource('players')}
                size="sm"
                className={source === 'players' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                ⚽ Desde jugadores ({playerEmails.length})
              </Button>
              <Button
                variant={source === 'manual' ? 'default' : 'outline'}
                onClick={() => setSource('manual')}
                size="sm"
                className={source === 'manual' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                ✏️ Pegar emails
              </Button>
            </div>

            {source === 'players' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-blue-800">
                  Se encontraron <strong>{playerEmails.length}</strong> emails únicos de primeros progenitores (email_padre) de jugadores activos.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleLoadFromPlayers} className="bg-blue-600 hover:bg-blue-700">
                    <Zap className="w-3 h-3 mr-1" />
                    Cargar todos al formulario
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopyEmails}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar al portapapeles
                  </Button>
                </div>
                {playerEmails.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:underline">Ver lista de emails</summary>
                    <div className="mt-2 max-h-32 overflow-y-auto bg-white rounded p-2 border text-slate-600 font-mono text-[11px] leading-relaxed">
                      {playerEmails.map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div>
              <Label>Tipo de invitación</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padre_nuevo">👨‍👩‍👧 Padre/Madre Nuevo</SelectItem>
                  <SelectItem value="jugador_adulto">🏃 Jugador +18</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Emails (uno por línea, o separados por comas)</Label>
              <Textarea
                value={rawEmails}
                onChange={(e) => setRawEmails(e.target.value)}
                placeholder={"padre1@gmail.com\npadre2@hotmail.com\npadre3@yahoo.es"}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            {/* Stats preview */}
            {uniqueEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                  📧 {uniqueEmails.length} emails únicos
                </Badge>
                <Badge className="bg-green-100 text-green-700 border border-green-200">
                  🆕 {newEmails.length} nuevos
                </Badge>
                {alreadyHaveCode.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {alreadyHaveCode.length} ya tienen código
                  </Badge>
                )}
              </div>
            )}

            {alreadyHaveCode.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-yellow-600 hover:underline">Ver emails que ya tienen código ({alreadyHaveCode.length})</summary>
                <div className="mt-1 bg-yellow-50 rounded p-2 border border-yellow-200 font-mono text-[11px]">
                  {alreadyHaveCode.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </details>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || newEmails.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generando {newEmails.length} códigos...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generar {newEmails.length} códigos
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}