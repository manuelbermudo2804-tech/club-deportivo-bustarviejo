import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";

import MatchResultForm from "../components/matches/MatchResultForm";
import MatchResultCard from "../components/matches/MatchResultCard";
import ImportResultsDialog from "../components/matches/ImportResultsDialog";
import UpcomingMatches from "../components/matches/UpcomingMatches";
import StandingsTable from "../components/matches/StandingsTable";

export default function MatchResults() {
  const [showForm, setShowForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("resultados");

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

  const { data: matchResults, isLoading } = useQuery({
    queryKey: ['matchResults'],
    queryFn: () => base44.entities.MatchResult.list('-fecha_partido'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
  });

  const createResultMutation = useMutation({
    mutationFn: (resultData) => base44.entities.MatchResult.create(resultData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchResults'] });
      setShowForm(false);
      setEditingResult(null);
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: ({ id, resultData }) => base44.entities.MatchResult.update(id, resultData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchResults'] });
      setShowForm(false);
      setEditingResult(null);
    },
  });

  const handleSubmit = async (resultData) => {
    if (editingResult) {
      updateResultMutation.mutate({ id: editingResult.id, resultData });
    } else {
      createResultMutation.mutate(resultData);
    }
  };

  const handleEdit = (result) => {
    setEditingResult(result);
    setShowForm(true);
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['matchResults'] });
  };

  const categories = [
    "Fútbol Pre-Benjamín (Mixto)",
    "Fútbol Benjamín (Mixto)",
    "Fútbol Alevín (Mixto)",
    "Fútbol Infantil (Mixto)",
    "Fútbol Cadete",
    "Fútbol Juvenil",
    "Fútbol Aficionado",
    "Fútbol Femenino"
  ];

  const filteredResults = selectedCategory === "all" 
    ? matchResults 
    : matchResults.filter(r => r.categoria === selectedCategory);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">⚽ Resultados y Clasificación</h1>
          <p className="text-slate-600 mt-1 text-sm">Partidos, próximos encuentros y tabla</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button
              onClick={() => {
                setEditingResult(null);
                setShowForm(!showForm);
              }}
              className="bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
          <MatchResultForm
            result={editingResult}
            callups={callups}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingResult(null);
            }}
            isSubmitting={createResultMutation.isPending || updateResultMutation.isPending}
          />
        )}
      </AnimatePresence>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="resultados">📊 Resultados</TabsTrigger>
          <TabsTrigger value="proximos">📅 Próximos</TabsTrigger>
          <TabsTrigger value="clasificacion">🏆 Clasificación</TabsTrigger>
        </TabsList>

        <TabsContent value="resultados" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <div className="text-6xl mb-4">⚽</div>
              <p className="text-slate-500">No hay resultados registrados</p>
              {isAdmin && (
                <p className="text-sm text-slate-400 mt-2">
                  Usa el botón "Importar" para sincronizar desde la federación
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredResults.map((result) => (
                  <MatchResultCard
                    key={result.id}
                    result={result}
                    onEdit={handleEdit}
                    isAdmin={isAdmin}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proximos" className="space-y-4">
          <UpcomingMatches callups={callups} />
        </TabsContent>

        <TabsContent value="clasificacion" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory === "all" ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <p className="text-slate-500">Selecciona una categoría para ver su clasificación</p>
            </div>
          ) : (
            <StandingsTable categoria={selectedCategory} />
          )}
        </TabsContent>
      </Tabs>

      <ImportResultsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}