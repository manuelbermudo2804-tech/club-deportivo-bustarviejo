import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Search, Download, Plus, Trash2, AlertCircle, 
  CheckCircle2, RefreshCw, ExternalLink, Eye 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RFFMScraper() {
  const [user, setUser] = useState(null);
  const [testConfig, setTestConfig] = useState({
    temporada: '20',
    tipo_juego: '1',
    competicion_id: '',
    grupo_id: '',
    api_url_manual: ''
  });
  const [newConfig, setNewConfig] = useState({
    nombre_liga: '',
    categoria: '',
    temporada: '20',
    tipo_juego: '1',
    competicion_id: '',
    grupo_id: '',
    activa: true,
    notas: ''
  });
  const [scrapingResult, setScrapingResult] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: configs = [] } = useQuery({
    queryKey: ['leagueConfigs'],
    queryFn: () => base44.entities.LeagueConfig.list(),
    enabled: !!user
  });

  // Validar configuración (sin scrapear)
  const testConfigMutation = useMutation({
    mutationFn: async (config) => {
      if (!config.competicion_id || !config.grupo_id) {
        throw new Error('Faltan competicion_id o grupo_id');
      }
      const url = `https://www.rffm.es/competicion/clasificaciones?temporada=${config.temporada}&tipojuego=${config.tipo_juego}&competicion=${config.competicion_id}&grupo=${config.grupo_id}`;
      return { 
        ok: true, 
        url,
        message: 'Configuración válida. El scraping se hace desde tu servicio externo (Node + Playwright).',
        clasificacion: []
      };
    },
    onSuccess: (data) => {
      setScrapingResult(data);
    },
    onError: (error) => {
      setScrapingResult({
        error: error.message,
        clasificacion: []
      });
    }
  });

  const createConfigMutation = useMutation({
    mutationFn: (configData) => base44.entities.LeagueConfig.create(configData),
    onSuccess: () => {
      queryClient.invalidateQueries(['leagueConfigs']);
      setShowAddForm(false);
      setNewConfig({
        nombre_liga: '',
        categoria: '',
        temporada: '20',
        tipo_juego: '1',
        competicion_id: '',
        grupo_id: '',
        activa: true,
        notas: ''
      });
    }
  });

  const deleteConfigMutation = useMutation({
    mutationFn: (id) => base44.entities.LeagueConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['leagueConfigs'])
  });

  // Ver clasificación guardada
  const viewStoredMutation = useMutation({
    mutationFn: async (config) => {
      const standings = await base44.entities.Standing.filter({ league_id: config.id });
      const url = `https://www.rffm.es/competicion/clasificaciones?temporada=${config.temporada}&tipojuego=${config.tipo_juego}&competicion=${config.competicion_id}&grupo=${config.grupo_id}`;
      return {
        ok: true,
        method: 'stored_data',
        clasificacion: standings.sort((a, b) => a.posicion - b.posicion),
        url,
        message: standings.length > 0 ? 'Datos almacenados en Base44' : 'Sin datos. Ejecuta tu scraper externo para sincronizar.'
      };
    },
    onSuccess: (data) => {
      setScrapingResult(data);
    }
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Solo administradores pueden acceder</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">🔍 Scraper RFFM</h1>
            <p className="text-slate-600 mt-1">Extrae clasificaciones automáticamente de la Federación</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Liga
          </Button>
        </div>

        <Alert className="border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>🏗️ Arquitectura:</strong><br/>
            • Esta UI gestiona las ligas y visualiza datos<br/>
            • El scraping real se hace desde tu <strong>servicio externo</strong> (Node + Playwright)<br/>
            • Tu scraper llama a <code className="bg-blue-200 px-1 rounded">syncRFFMLeague</code> para guardar datos<br/>
            • Aquí solo validas configuración y ves datos almacenados
          </AlertDescription>
        </Alert>

        {showAddForm && (
          <Card className="border-2 border-orange-500">
            <CardHeader>
              <CardTitle>➕ Añadir Nueva Liga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de la Liga *</Label>
                  <Input
                    placeholder="ej: Juvenil Grupo 12"
                    value={newConfig.nombre_liga}
                    onChange={(e) => setNewConfig({...newConfig, nombre_liga: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Categoría del Club *</Label>
                  <Input
                    placeholder="ej: Fútbol Juvenil"
                    value={newConfig.categoria}
                    onChange={(e) => setNewConfig({...newConfig, categoria: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Temporada * (ej: 20)</Label>
                  <Input
                    value={newConfig.temporada}
                    onChange={(e) => setNewConfig({...newConfig, temporada: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Tipo Juego * (1=F11, 2=F7)</Label>
                  <Input
                    value={newConfig.tipo_juego}
                    onChange={(e) => setNewConfig({...newConfig, tipo_juego: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Competición ID *</Label>
                  <Input
                    placeholder="ej: 21434175"
                    value={newConfig.competicion_id}
                    onChange={(e) => setNewConfig({...newConfig, competicion_id: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Grupo ID *</Label>
                  <Input
                    placeholder="ej: 21434176"
                    value={newConfig.grupo_id}
                    onChange={(e) => setNewConfig({...newConfig, grupo_id: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  placeholder="Información adicional..."
                  value={newConfig.notas}
                  onChange={(e) => setNewConfig({...newConfig, notas: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newConfig.activa}
                  onCheckedChange={(checked) => setNewConfig({...newConfig, activa: checked})}
                />
                <Label>Scraping automático activo</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createConfigMutation.mutate(newConfig)}
                  disabled={!newConfig.nombre_liga || !newConfig.competicion_id || !newConfig.grupo_id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}



        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <Card key={config.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{config.nombre_liga}</CardTitle>
                    <p className="text-sm text-slate-600">{config.categoria}</p>
                  </div>
                  {config.activa ? (
                    <Badge className="bg-green-500">Activa</Badge>
                  ) : (
                    <Badge variant="outline">Inactiva</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-slate-600 space-y-1">
                  <p><strong>Temporada:</strong> {config.temporada}</p>
                  <p><strong>Tipo:</strong> {config.tipo_juego === '1' ? 'Fútbol 11' : 'Fútbol 7'}</p>
                  <p><strong>Competición:</strong> {config.competicion_id}</p>
                  <p><strong>Grupo:</strong> {config.grupo_id}</p>
                  {config.ultima_actualizacion && (
                    <p><strong>Última actualización:</strong> {new Date(config.ultima_actualizacion).toLocaleString('es-ES')}</p>
                  )}
                </div>
                {config.notas && (
                  <p className="text-xs text-slate-500 italic">{config.notas}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => viewStoredMutation.mutate(config)}
                    disabled={viewStoredMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver Datos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = `https://www.rffm.es/competicion/clasificaciones?temporada=${config.temporada}&tipojuego=${config.tipo_juego}&competicion=${config.competicion_id}&grupo=${config.grupo_id}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('¿Eliminar esta liga?')) {
                        deleteConfigMutation.mutate(config.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>


      </div>
    </div>
  );
}