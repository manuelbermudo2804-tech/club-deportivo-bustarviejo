import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Plus, Copy, Share2, LogIn, Trophy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Gestor de mini-ligas para un participante
// - Muestra las ligas a las que pertenece
// - Permite crear una nueva
// - Permite unirse con código
// - Compartir por WhatsApp
export default function MiniLigasManager({ participante, onUpdate }) {
  const [ligas, setLigas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [showUnirse, setShowUnirse] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [codigoUnirse, setCodigoUnirse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cargarLigas = async () => {
    const codigos = participante?.mini_liga_codigos || [];
    if (codigos.length === 0) { setLigas([]); setLoading(false); return; }
    try {
      const todas = await base44.entities.PorraLiga.list('', 200);
      setLigas(todas.filter(l => codigos.includes(l.codigo)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarLigas(); }, [participante?.mini_liga_codigos?.length]);

  const handleCrear = async () => {
    if (!nuevoNombre.trim() || nuevoNombre.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('porraCrearLiga', {
        token_acceso: participante.token_acceso,
        nombre: nuevoNombre,
        descripcion: nuevaDesc,
      });
      if (res.data?.success) {
        toast.success(`✅ Liga "${nuevoNombre}" creada con código ${res.data.codigo}`);
        setShowCrear(false);
        setNuevoNombre(''); setNuevaDesc('');
        await cargarLigas();
        onUpdate?.();
      } else {
        toast.error(res.data?.error || 'Error al crear liga');
      }
    } catch (e) {
      toast.error('Error al crear liga');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnirse = async () => {
    if (!codigoUnirse.trim()) {
      toast.error('Introduce un código');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('porraUnirseLiga', {
        token_acceso: participante.token_acceso,
        codigo: codigoUnirse,
      });
      if (res.data?.success) {
        toast.success(res.data.mensaje || '¡Te has unido!');
        setShowUnirse(false);
        setCodigoUnirse('');
        await cargarLigas();
        onUpdate?.();
      } else {
        toast.error(res.data?.error || 'Error al unirse');
      }
    } catch (e) {
      toast.error('Error al unirse');
    } finally {
      setSubmitting(false);
    }
  };

  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado');
  };

  const compartirWhatsApp = (liga) => {
    const url = `${window.location.origin}/Porra`;
    const mensaje = `🏆 *${liga.nombre}* — Porra Mundial 2026\n\n¡Te invito a mi mini-liga en la Porra del Mundial del CD Bustarviejo! 🇪🇸⚽\n\n📝 *Cómo unirte:*\n1️⃣ Apúntate en: ${url}\n2️⃣ Cuando rellenes el formulario, introduce este código:\n\n🔑 *${liga.codigo}*\n\n¡A ver quién es el mejor profeta! 🔮`;
    const wa = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(wa, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Botones de acción */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setShowCrear(true)} className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Crear liga
        </Button>
        <Button onClick={() => setShowUnirse(true)} variant="outline" className="border-2">
          <LogIn className="w-4 h-4 mr-1" /> Unirme con código
        </Button>
      </div>

      {/* Lista de ligas */}
      {loading ? (
        <div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" /></div>
      ) : ligas.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-6 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="font-bold text-slate-700">No estás en ninguna mini-liga</p>
            <p className="text-xs text-slate-500 mt-1">
              Crea una para competir con tus amigos o únete a una existente con su código
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ligas.map(liga => (
            <Card key={liga.id} className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 truncate flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-orange-600 flex-shrink-0" /> {liga.nombre}
                    </p>
                    {liga.descripcion && <p className="text-xs text-slate-600 mt-0.5 truncate">{liga.descripcion}</p>}
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                        👥 {liga.participantes_emails?.length || 0} {liga.participantes_emails?.length === 1 ? 'miembro' : 'miembros'}
                      </span>
                      <button
                        onClick={() => copiarCodigo(liga.codigo)}
                        className="bg-slate-900 text-yellow-300 px-2 py-0.5 rounded-full font-mono font-black hover:bg-slate-800 flex items-center gap-1"
                      >
                        {liga.codigo} <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  <Button
                    size="sm"
                    onClick={() => compartirWhatsApp(liga)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/PorraRanking?liga=${liga.codigo}`, '_blank')}
                    className="text-xs"
                  >
                    <Trophy className="w-3.5 h-3.5 mr-1" /> Ranking
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear liga */}
      <Dialog open={showCrear} onOpenChange={setShowCrear}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" /> Crear mini-liga
            </DialogTitle>
            <DialogDescription>
              Crea tu liga privada para competir solo con tus amigos. Te daremos un código que podrás compartir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Nombre de la liga *</label>
              <Input
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Ej: Los del Bar Pepe"
                maxLength={40}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Descripción (opcional)</label>
              <Input
                value={nuevaDesc}
                onChange={e => setNuevaDesc(e.target.value)}
                placeholder="Ej: Pandilla de amigos del barrio"
                maxLength={100}
              />
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-800">
              💡 Tras crearla recibirás un <strong>código de 6 caracteres</strong> que podrás compartir por WhatsApp.
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCrear(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleCrear} disabled={submitting} className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Crear</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal unirse */}
      <Dialog open={showUnirse} onOpenChange={setShowUnirse}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-orange-600" /> Unirse a una mini-liga
            </DialogTitle>
            <DialogDescription>
              Introduce el código de 6 caracteres que te ha pasado tu amigo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              value={codigoUnirse}
              onChange={e => setCodigoUnirse(e.target.value.toUpperCase())}
              placeholder="Ej: BAR2026"
              maxLength={6}
              className="text-center font-mono font-black text-2xl tracking-widest h-14"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowUnirse(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleUnirse} disabled={submitting} className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4 mr-1" /> Unirme</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}