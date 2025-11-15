import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Settings, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TeamConfigAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingConfig, setEditingConfig] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.filter({ temporada: "2024-2025" }),
    initialData: [],
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamConfigs'] });
      setEditingConfig({});
      toast.success("✅ URLs guardadas correctamente. Ahora ve al Match Center y recarga los datos.");
    },
    onError: (error) => {
      toast.error("❌ Error al guardar: " + error.message);
    }
  });

  const handleFieldChange = (configId, field, value) => {
    setEditingConfig(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [field]: value
      }
    }));
  };

  const handleSave = (config) => {
    const updates = editingConfig[config.id] || {};
    
    if (!updates.url_clasificacion && !config.url_clasificacion) {
      toast.error("❌ Debes añadir la URL de clasificación");
      return;
    }
    if (!updates.url_calendario && !config.url_calendario) {
      toast.error("❌ Debes añadir la URL de calendario");
      return;
    }

    updateConfigMutation.mutate({
      id: config.id,
      data: {
        ...config,
        ...updates
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">
            🔒 Solo administradores pueden acceder a esta página
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Cargando configuraciones...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-orange-600" />
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            Configuración de Equipos RFFM
          </h1>
          <p className="text-slate-600 text-sm">
            Configura las URLs de clasificación y calendario para cada equipo
          </p>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          <div className="space-y-2 text-sm text-blue-900">
            <p className="font-semibold">📋 Cómo obtener las URLs:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Ve a <a href="https://www.rffm.es/fichaclub/4095" target="_blank" className="underline text-blue-600">RFFM - CD Bustarviejo</a></li>
              <li>Haz clic en cada equipo para ver su competición</li>
              <li>En la competición, haz clic en <strong>"Clasificación"</strong> y copia toda la URL de la barra del navegador</li>
              <li>Luego haz clic en <strong>"Calendario"</strong> y copia toda la URL de la barra del navegador</li>
              <li>Pégalas en los campos correspondientes aquí y haz clic en <strong>Guardar</strong></li>
              <li><strong className="text-orange-700">Importante:</strong> Después de guardar, ve al Match Center y pulsa el botón de Refrescar (🔄) en cada equipo</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {configs.map((config) => {
          const edited = editingConfig[config.id] || {};
          const urlClasificacion = edited.url_clasificacion !== undefined ? edited.url_clasificacion : config.url_clasificacion;
          const urlCalendario = edited.url_calendario !== undefined ? edited.url_calendario : config.url_calendario;
          const hasUrls = urlClasificacion && urlCalendario;
          const hasChanges = Object.keys(edited).length > 0;

          return (
            <Card key={config.id} className={`border-2 ${hasUrls ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span className="text-lg">{config.categoria_interna}</span>
                    <p className="text-sm font-normal text-slate-600 mt-1">
                      {config.nombre_equipo_rffm} - {config.competicion_rffm} {config.grupo_rffm}
                    </p>
                  </div>
                  {hasUrls ? (
                    <span className="text-green-600 text-sm">✅ Configurado</span>
                  ) : (
                    <span className="text-orange-600 text-sm">⚠️ Faltan URLs</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-slate-700">
                    URL Clasificación *
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={urlClasificacion || ''}
                      onChange={(e) => handleFieldChange(config.id, 'url_clasificacion', e.target.value)}
                      placeholder="https://www.rffm.es/competicion/clasificaciones?temporada=2024&..."
                      className="flex-1 text-sm"
                    />
                    {urlClasificacion && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(urlClasificacion, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700">
                    URL Calendario *
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={urlCalendario || ''}
                      onChange={(e) => handleFieldChange(config.id, 'url_calendario', e.target.value)}
                      placeholder="https://www.rffm.es/competicion/calendario?temporada=2024&..."
                      className="flex-1 text-sm"
                    />
                    {urlCalendario && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(urlCalendario, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSave(config)}
                    disabled={updateConfigMutation.isPending || !hasChanges}
                    className={`${hasChanges ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-400'}`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateConfigMutation.isPending ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert className="bg-orange-50 border-orange-200">
        <AlertDescription className="text-sm text-orange-900">
          <p className="font-semibold mb-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            ⚠️ Después de guardar las URLs:
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Ve a la página <strong>Match Center</strong></li>
            <li>Haz clic en el botón <strong>🔄 Refrescar</strong> que aparece en la esquina superior derecha de cada tarjeta de equipo</li>
            <li>Espera unos segundos mientras se cargan los nuevos datos desde la RFFM</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Alert className="bg-slate-50 border-slate-200">
        <AlertDescription className="text-sm text-slate-600">
          <p className="font-semibold mb-2">💡 Consejos:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Las URLs deben ser completas (empezar por https://www.rffm.es/...)</li>
            <li>Deben incluir los parámetros: temporada, tipojuego, competicion y grupo</li>
            <li>Puedes probar las URLs haciendo clic en el icono 🔗 antes de guardar</li>
            <li>Si los datos no aparecen correctos, verifica que la URL sea la correcta abriendo el enlace</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}