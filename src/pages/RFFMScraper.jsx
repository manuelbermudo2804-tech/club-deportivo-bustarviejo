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
    grupo_id: ''
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

  const testScrapeMutation = useMutation({
    mutationFn: async (config) => {
      console.log('🚀 Enviando request a scrapeRFFM con:', config);
      const response = await base44.functions.invoke('scrapeRFFM', {
        ...config,
        test_mode: true
      });
      console.log('📦 Respuesta recibida:', response);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Scraping exitoso:', data);
      setScrapingResult(data);
    },
    onError: (error) => {
      console.error('❌ Error en scraping:', error);
      setScrapingResult({
        error: error.message,
        clasificacion: [],
        url: testConfig ? `https://www.rffm.es/competicion/clasificaciones?temporada=${testConfig.temporada}&tipojuego=${testConfig.tipo_juego}&competicion=${testConfig.competicion_id}&grupo=${testConfig.grupo_id}` : ''
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

  const scrapeConfigMutation = useMutation({
    mutationFn: async (config) => {
      const response = await base44.functions.invoke('scrapeRFFM', {
        temporada: config.temporada,
        tipo_juego: config.tipo_juego,
        competicion_id: config.competicion_id,
        grupo_id: config.grupo_id,
        test_mode: true
      });
      return response.data;
    },
    onSuccess: (data, config) => {
      setScrapingResult(data);
      base44.entities.LeagueConfig.update(config.id, {
        ultima_actualizacion: new Date().toISOString()
      });
      queryClient.invalidateQueries(['leagueConfigs']);
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

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>¿Cómo sacar el ID de una liga?</strong><br/>
            1. Ve a <a href="https://www.rffm.es/competicion/clasificaciones" target="_blank" className="text-orange-600 underline">RFFM Clasificaciones</a><br/>
            2. Busca tu liga y entra en la clasificación<br/>
            3. Copia la URL: <code className="bg-slate-200 px-1 rounded">temporada=20&tipojuego=1&competicion=21434175&grupo=21434176</code><br/>
            4. Pega los números abajo y prueba
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

        <Card>
          <CardHeader>
            <CardTitle>🧪 Prueba Rápida (sin guardar)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>📋 Pega la URL completa de RFFM (se extraerán los datos automáticamente)</Label>
              <Input
                placeholder="https://www.rffm.es/competicion/clasificaciones?temporada=20&tipojuego=1&competicion=..."
                onPaste={(e) => {
                  const url = e.clipboardData.getData('text');
                  try {
                    const urlObj = new URL(url);
                    const params = new URLSearchParams(urlObj.search);
                    setTestConfig({
                      temporada: params.get('temporada') || '20',
                      tipo_juego: params.get('tipojuego') || '1',
                      competicion_id: params.get('competicion') || '',
                      grupo_id: params.get('grupo') || ''
                    });
                  } catch (err) {
                    console.log('Error parsing URL:', err);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Temporada</Label>
                <Input
                  value={testConfig.temporada}
                  onChange={(e) => setTestConfig({...testConfig, temporada: e.target.value})}
                />
              </div>
              <div>
                <Label>Tipo Juego</Label>
                <Input
                  value={testConfig.tipo_juego}
                  onChange={(e) => setTestConfig({...testConfig, tipo_juego: e.target.value})}
                />
              </div>
              <div>
                <Label>Competición ID</Label>
                <Input
                  placeholder="21434175"
                  value={testConfig.competicion_id}
                  onChange={(e) => setTestConfig({...testConfig, competicion_id: e.target.value})}
                />
              </div>
              <div>
                <Label>Grupo ID</Label>
                <Input
                  placeholder="21434176"
                  value={testConfig.grupo_id}
                  onChange={(e) => setTestConfig({...testConfig, grupo_id: e.target.value})}
                />
              </div>
            </div>
            {(!testConfig.competicion_id?.trim() || !testConfig.grupo_id?.trim()) && (
              <div className="text-sm text-orange-600 font-medium">
                ⚠️ Faltan campos: {!testConfig.competicion_id?.trim() && 'Competición ID'} {!testConfig.grupo_id?.trim() && 'Grupo ID'}
              </div>
            )}
            <Button
              onClick={() => {
                console.log('Test Config:', testConfig);
                testScrapeMutation.mutate(testConfig);
              }}
              disabled={
                testScrapeMutation.isPending || 
                !testConfig.competicion_id?.trim() || 
                !testConfig.grupo_id?.trim()
              }
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4 mr-2" />
              {testScrapeMutation.isPending ? 'Extrayendo...' : 'Probar Scraping'}
            </Button>
          </CardContent>
        </Card>

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
                    onClick={() => scrapeConfigMutation.mutate(config)}
                    disabled={scrapeConfigMutation.isPending}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Probar
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

        {scrapingResult && (
          <Card className="border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Resultado del Scraping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <Badge className="bg-blue-500">
                  {scrapingResult.clasificacion?.length || 0} equipos
                </Badge>
                <Badge className="bg-purple-500">
                  {scrapingResult.resultados?.length || 0} resultados
                </Badge>
                <a 
                  href={scrapingResult.url} 
                  target="_blank" 
                  className="text-orange-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver en RFFM
                </a>
              </div>

              {scrapingResult.error && (
                <Alert className="border-red-500 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Error:</strong> {scrapingResult.error}
                  </AlertDescription>
                </Alert>
              )}

              {scrapingResult.clasificacion?.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">📊 Clasificación extraída ({scrapingResult.clasificacion.length} equipos):</h3>
                  <Badge className="mb-2 bg-green-500">Método: {scrapingResult.method || 'desconocido'}</Badge>
                  <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Pos</th>
                          <th className="text-left py-2">Equipo</th>
                          <th className="text-center py-2">PJ</th>
                          <th className="text-center py-2">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scrapingResult.clasificacion.map((equipo, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2">{equipo.posicion}</td>
                            <td className="py-2 font-medium">{equipo.equipo}</td>
                            <td className="text-center py-2">{equipo.partidos_jugados}</td>
                            <td className="text-center py-2 font-bold">{equipo.puntos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!scrapingResult.error && scrapingResult.clasificacion?.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No se encontraron equipos. Verifica los parámetros.
                    {scrapingResult.html_length && (
                      <><br/>HTML recibido: {scrapingResult.html_length} caracteres</>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Ver respuesta completa (debug)</summary>
                <pre className="bg-slate-900 text-green-400 p-4 rounded mt-2 overflow-x-auto">
                  {JSON.stringify(scrapingResult, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}