import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BASE_CATEGORIES = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

export default function CategoryCleanupTool() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const all = await base44.entities.CategoryConfig.list();
      setCategories(all);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  };

  // Agrupar por temporada+nombre para detectar duplicados reales
  const grouped = {};
  categories.forEach(cat => {
    const key = `${cat.temporada}||${cat.nombre}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cat);
  });

  // Para cada grupo con >1, el primero se queda, el resto son duplicados
  const toKeep = [];
  const toDelete = [];
  Object.values(grouped).forEach(group => {
    // Preferir el que tenga es_base=true, luego el más antiguo
    const sorted = [...group].sort((a, b) => {
      if (a.es_base && !b.es_base) return -1;
      if (!a.es_base && b.es_base) return 1;
      return new Date(a.created_date) - new Date(b.created_date);
    });
    toKeep.push(sorted[0]);
    toDelete.push(...sorted.slice(1));
  });

  const duplicateCount = toDelete.length;

  // Resumen por temporada
  const temporadaSummary = {};
  categories.forEach(cat => {
    const t = cat.temporada || '(sin temporada)';
    temporadaSummary[t] = (temporadaSummary[t] || 0) + 1;
  });

  const handleAutoCleanup = async () => {
    if (toDelete.length === 0) {
      toast.success("No hay duplicados que limpiar");
      return;
    }

    if (!confirm(`¿ELIMINAR ${toDelete.length} CATEGORÍAS DUPLICADAS?\n\nSe mantendrá 1 registro por cada nombre+temporada.\nSe eliminarán las ${toDelete.length} copias extras.\n\n¿Continuar?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      let deleted = 0;
      let failed = 0;

      for (const cat of toDelete) {
        try {
          await base44.entities.CategoryConfig.delete(cat.id);
          deleted++;
        } catch (e) {
          console.error(`Error borrando ${cat.id}:`, e);
          failed++;
        }
      }

      toast.success(`✅ ${deleted} duplicados eliminados${failed > 0 ? `, ${failed} fallidos` : ''}`);
      fetchCategories();
    } catch (error) {
      console.error("Error deleting categories:", error);
      toast.error("Error al eliminar categorías");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-orange-300">
        <CardContent className="pt-6">
          <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${duplicateCount > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {duplicateCount > 0 ? (
            <><AlertTriangle className="w-5 h-5 text-red-600" /> 🧹 Limpieza de Categorías Duplicadas</>
          ) : (
            <><CheckCircle2 className="w-5 h-5 text-green-600" /> ✅ Categorías Limpias</>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        <div className="bg-white rounded-lg p-3 border shadow-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
              <p className="text-xs text-slate-600">Total registros</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{toKeep.length}</p>
              <p className="text-xs text-slate-600">Únicos (se mantienen)</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${duplicateCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{duplicateCount}</p>
              <p className="text-xs text-slate-600">Duplicados (a borrar)</p>
            </div>
          </div>
        </div>

        {/* Detalle por temporada */}
        <div className="bg-white rounded-lg p-3 border shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-2">📅 Por Temporada:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(temporadaSummary).sort().map(([t, count]) => (
              <Badge key={t} variant="outline" className="text-xs">
                {t}: <strong className="ml-1">{count}</strong>
              </Badge>
            ))}
          </div>
        </div>

        {duplicateCount > 0 && (
          <Alert className="bg-red-50 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">
              Hay <strong>{duplicateCount} categorías duplicadas</strong> (mismo nombre + temporada repetidos).
              Se mantendrá 1 registro por cada combinación y se borrarán las copias.
            </AlertDescription>
          </Alert>
        )}

        {duplicateCount === 0 && (
          <Alert className="bg-green-50 border-green-300">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 ml-2">
              ✅ No hay categorías duplicadas. Base de datos limpia ({toKeep.length} categorías únicas).
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={fetchCategories}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </Button>
          {duplicateCount > 0 && (
            <Button
              onClick={handleAutoCleanup}
              disabled={isProcessing}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Limpiando...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Limpiar {duplicateCount} duplicados</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}