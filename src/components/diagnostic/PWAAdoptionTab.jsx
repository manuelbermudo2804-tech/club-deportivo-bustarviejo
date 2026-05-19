import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Smartphone, Globe, Search, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PWAAdoptionTab() {
  const [search, setSearch] = useState("");

  // Cargar muestra amplia de eventos recientes (todos los tipos) para detectar is_pwa
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['pwa-adoption-events'],
    queryFn: async () => {
      const types = ['button_click', 'input_change', 'upload_start', 'upload_success', 'upload_error', 'wizard_step', 'app_error', 'js_error'];
      const results = await Promise.all(
        types.map(t => base44.entities.UploadDiagnostic.filter({ event_type: t }, '-created_date', 200))
      );
      return results.flat();
    },
    refetchInterval: 30000,
  });

  // Agrupar por usuario y determinar adopción PWA
  const users = useMemo(() => {
    const byUser = {};
    for (const e of events) {
      if (!e.user_email) continue;
      if (!byUser[e.user_email]) {
        byUser[e.user_email] = {
          email: e.user_email,
          totalEvents: 0,
          pwaEvents: 0,
          webEvents: 0,
          lastSeen: null,
          lastPwaSeen: null,
          device: e.device || '?',
        };
      }
      const u = byUser[e.user_email];
      u.totalEvents++;
      if (e.is_pwa === true) {
        u.pwaEvents++;
        if (!u.lastPwaSeen || new Date(e.created_date) > new Date(u.lastPwaSeen)) {
          u.lastPwaSeen = e.created_date;
        }
      } else {
        u.webEvents++;
      }
      if (!u.lastSeen || new Date(e.created_date) > new Date(u.lastSeen)) {
        u.lastSeen = e.created_date;
        u.device = e.device || u.device;
      }
    }
    return Object.values(byUser).map(u => ({
      ...u,
      hasInstalled: u.pwaEvents > 0,
      adoptionPct: u.totalEvents > 0 ? Math.round((u.pwaEvents / u.totalEvents) * 100) : 0,
    })).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }, [events]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.device || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const installed = users.filter(u => u.hasInstalled).length;
    const webOnly = total - installed;
    const pct = total > 0 ? Math.round((installed / total) * 100) : 0;
    return { total, installed, webOnly, pct };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-slate-500">Usuarios detectados</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.installed}</div>
            <div className="text-xs text-green-600">Con app instalada</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.webOnly}</div>
            <div className="text-xs text-orange-600">Solo navegador</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pct}%</div>
            <div className="text-xs text-blue-600">Adopción PWA</div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-3 text-xs text-blue-900">
          📊 <strong>Cómo se detecta:</strong> Cada vez que un usuario abre la app, registramos si está en modo
          PWA instalada (<code className="bg-blue-100 px-1 rounded">is_pwa=true</code>) o en navegador
          (<code className="bg-blue-100 px-1 rounded">is_pwa=false</code>). Solo se muestran usuarios con actividad reciente.
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar email o dispositivo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando datos...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">No hay datos de usuarios</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <Card key={u.email} className={u.hasInstalled ? 'border-green-200 bg-green-50/20' : 'border-orange-200 bg-orange-50/20'}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${u.hasInstalled ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {u.hasInstalled ? (
                      <Smartphone className="w-5 h-5 text-green-700" />
                    ) : (
                      <Globe className="w-5 h-5 text-orange-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{u.email}</span>
                      {u.hasInstalled ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> App instalada
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">
                          <XCircle className="w-3 h-3 mr-1" /> Solo navegador
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>📱 {u.device}</span>
                      <span>{u.totalEvents} eventos ({u.pwaEvents} PWA / {u.webEvents} web)</span>
                      {u.hasInstalled && (
                        <span className="text-green-700">
                          📊 {u.adoptionPct}% de uso en PWA
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Última actividad: {u.lastSeen ? format(new Date(u.lastSeen), "dd/MM HH:mm", { locale: es }) : '?'}
                      {u.lastPwaSeen && (
                        <span className="ml-2 text-green-600">
                          · Último uso PWA: {format(new Date(u.lastPwaSeen), "dd/MM HH:mm", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}