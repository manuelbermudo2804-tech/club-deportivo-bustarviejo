import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function CategoryCleanupTool() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Categorías correctas (nombres completos desde Player.deporte)
  const CORRECT_CATEGORIES = [
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

  // Categorías incorrectas a eliminar (shorthand)
  const DUPLICATE_CATEGORIES = [
    "PRE-BENJAMIN",
    "PRE BENJAMIN",
    "BENJAMIN",
    "ALEVIN",
    "INFANTIL",
    "CADETE",
    "JUVENIL",
    "AFICIONADO",
    "FEMENINO",
    "BALONCESTO"
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const allCategories = await base44.entities.CategoryConfig.list();
      setCategories(allCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  };

  // Identificar duplicadas
  const duplicates = categories.filter(cat => 
    DUPLICATE_CATEGORIES.includes(cat.nombre)
  );

  const correctOnes = categories.filter(cat => 
    CORRECT_CATEGORIES.includes(cat.nombre)
  );

  const handleSelectAll = (isDuplicate = true) => {
    const targetList = isDuplicate ? duplicates : correctOnes;
    const newSelected = new Set(selectedIds);
    
    if (targetList.length === selectedIds.size && targetList.every(c => selectedIds.has(c.id))) {
      targetList.forEach(c => newSelected.delete(c.id));
    } else {
      targetList.forEach(c => newSelected.add(c.id));
    }
    setSelectedIds(newSelected);
  };

  const handleToggleCategory = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos una categoría para eliminar");
      return;
    }

    const categoriesToDelete = categories.filter(c => selectedIds.has(c.id));
    
    if (!confirm(`¿ELIMINAR ${categoriesToDelete.length} CATEGORÍAS DUPLICADAS?\n\nEsto no se puede deshacer:\n${categoriesToDelete.map(c => `- ${c.nombre} (${c.temporada})`).join('\n')}`)) {
      return;
    }

    try {
      setIsProcessing(true);
      let deleted = 0;

      for (const category of categoriesToDelete) {
        await base44.entities.CategoryConfig.delete(category.id);
        deleted++;
      }

      toast.success(`✅ ${deleted} categorías duplicadas eliminadas`);
      setSelectedIds(new Set());
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
    <Card className="border-2 border-orange-300 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="w-5 h-5" />
          🧹 Limpieza de Categorías Duplicadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            Se encontraron <strong>{duplicates.length} categorías duplicadas</strong>. 
            Usa esta herramienta para eliminarlas de forma segura.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {/* Sección: Categorías CORRECTAS */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-300">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-green-900 text-sm">✅ CATEGORÍAS CORRECTAS ({correctOnes.length})</p>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {correctOnes.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 text-sm p-1">
                  <span className="text-green-700">✓</span>
                  <span className="text-slate-700">{cat.nombre}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{cat.temporada}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Sección: Categorías DUPLICADAS */}
          {duplicates.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-300">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-red-900 text-sm">❌ CATEGORÍAS DUPLICADAS A ELIMINAR ({duplicates.length})</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => handleSelectAll(true)}
                >
                  {duplicates.length === selectedIds.size && duplicates.every(c => selectedIds.has(c.id)) ? "Deseleccionar todo" : "Seleccionar todo"}
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {duplicates.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 text-sm p-1 hover:bg-red-100 rounded">
                    <Checkbox
                      checked={selectedIds.has(cat.id)}
                      onCheckedChange={() => handleToggleCategory(cat.id)}
                    />
                    <span className="text-red-700 flex-1">{cat.nombre}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{cat.temporada}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={fetchCategories}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </Button>
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || isProcessing}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </div>

        {duplicates.length === 0 && (
          <Alert className="bg-green-50 border-green-300">
            <AlertDescription className="text-green-800">
              ✅ No hay categorías duplicadas. Base de datos limpia.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}