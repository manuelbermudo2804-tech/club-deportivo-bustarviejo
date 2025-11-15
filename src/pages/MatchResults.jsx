import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import MatchResultForm from "../components/matches/MatchResultForm";
import MatchResultCard from "../components/matches/MatchResultCard";
import ImportResultsDialog from "../components/matches/ImportResultsDialog";

export default function MatchResults() {
  const [showForm, setShowForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">⚽ Resultados de Partidos</h1>
          <p className="text-slate-600 mt-1">Registro y estadísticas de partidos</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <Download className="w-5 h-5 mr-2" />
              Importar Automático
            </Button>
            <Button
              onClick={() => {
                setEditingResult(null);
                setShowForm(!showForm);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Registrar Manual
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

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : matchResults.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="text-6xl mb-4">⚽</div>
          <p className="text-slate-500">No hay resultados registrados</p>
          {isAdmin && (
            <p className="text-sm text-slate-400 mt-2">
              Usa el botón "Importar Automático" para sincronizar desde la federación
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {matchResults.map((result) => (
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

      <ImportResultsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}