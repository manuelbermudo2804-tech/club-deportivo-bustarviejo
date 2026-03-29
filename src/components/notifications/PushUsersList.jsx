import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp, BellOff, CheckCircle2, Mail, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PushUsersList({ usersWithoutPush, allUsers, emailsWithPush }) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState('without');
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null); // email being sent
  const [sentEmails, setSentEmails] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('push_reminder_sent') || '[]')); } catch { return new Set(); }
  });

  const markSent = (email) => {
    setSentEmails(prev => {
      const next = new Set(prev);
      next.add(email);
      try { localStorage.setItem('push_reminder_sent', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const sendIndividualEmail = async (user) => {
    setSendingEmail(user.email);
    try {
      await base44.functions.invoke('sendPushActivationEmails', { target_email: user.email });
      markSent(user.email);
      toast.success(`Email enviado a ${user.full_name || user.email}`);
    } catch (e) {
      toast.error('Error al enviar: ' + e.message);
    }
    setSendingEmail(null);
  };

  const sendBulkEmails = async () => {
    if (!confirm(`¿Enviar email recordatorio a ${usersWithoutPush.length} usuarios sin push activadas?`)) return;
    setSendingAll(true);
    try {
      const res = await base44.functions.invoke('sendPushActivationEmails', {});
      const data = res.data;
      usersWithoutPush.forEach(u => markSent(u.email));
      toast.success(`✅ ${data.sent} emails enviados (${data.failed} fallidos)`);
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
    setSendingAll(false);
  }; // 'without' | 'all'

  const filteredWithout = useMemo(() => {
    const q = search.toLowerCase();
    return usersWithoutPush.filter(u => 
      (u.full_name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q)
    );
  }, [usersWithoutPush, search]);

  const filteredAll = useMemo(() => {
    if (view !== 'all') return [];
    const q = search.toLowerCase();
    return allUsers
      .filter(u => u.role !== 'tablet')
      .filter(u => (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .map(u => ({ ...u, hasPush: emailsWithPush.has(u.email) }))
      .sort((a, b) => a.hasPush === b.hasPush ? 0 : a.hasPush ? 1 : -1);
  }, [allUsers, emailsWithPush, search, view]);

  const displayList = view === 'without' ? filteredWithout : filteredAll;
  const visibleList = showAll ? displayList : displayList.slice(0, 20);

  const getRoleBadge = (user) => {
    if (user.role === 'admin') return <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>;
    if (user.es_entrenador) return <Badge className="bg-blue-100 text-blue-700 text-xs">Entrenador</Badge>;
    if (user.es_coordinador) return <Badge className="bg-teal-100 text-teal-700 text-xs">Coordinador</Badge>;
    if (user.es_tesorero) return <Badge className="bg-amber-100 text-amber-700 text-xs">Tesorero</Badge>;
    return <Badge variant="outline" className="text-xs">Familia</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="w-5 h-5 text-red-500" />
            {view === 'without' ? `Usuarios sin push (${usersWithoutPush.length})` : `Todos los usuarios (${allUsers.filter(u => u.role !== 'tablet').length})`}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant={view === 'without' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => { setView('without'); setShowAll(false); }}
            >
              Sin push
            </Button>
            <Button 
              variant={view === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => { setView('all'); setShowAll(false); }}
            >
              Todos
            </Button>
          </div>
        </div>
        {view === 'without' && usersWithoutPush.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={sendBulkEmails}
              disabled={sendingAll}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              {sendingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
              {sendingAll ? 'Enviando...' : `📧 Enviar email a todos (${usersWithoutPush.length})`}
            </Button>
            <p className="text-xs text-slate-500 self-center">Les llegará un email con instrucciones para activar las push</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre o email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {visibleList.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            {search ? 'Sin resultados' : view === 'without' ? '🎉 ¡Todos los usuarios tienen push activas!' : 'No hay usuarios'}
          </p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {visibleList.map(u => (
              <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getRoleBadge(u)}
                  {view === 'all' && (
                    u.hasPush 
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <BellOff className="w-4 h-4 text-red-400" />
                  )}
                  {(view === 'without' || (view === 'all' && !u.hasPush)) && (
                    sentEmails.has(u.email) ? (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        disabled={sendingEmail === u.email}
                        onClick={(e) => { e.stopPropagation(); sendIndividualEmail(u); }}
                      >
                        {sendingEmail === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                        Email
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {displayList.length > 20 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showAll ? 'Mostrar menos' : `Ver todos (${displayList.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}