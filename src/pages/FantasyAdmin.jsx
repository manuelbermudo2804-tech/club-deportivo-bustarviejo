import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import FantasyAdminConfig from "@/components/fantasy/FantasyAdminConfig";
import FantasyAdminEntries from "@/components/fantasy/FantasyAdminEntries";
import FantasyLeaderboard from "@/components/fantasy/FantasyLeaderboard";

export default function FantasyAdmin() {
  const [config, setConfig] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [configs, allEntries] = await Promise.all([
        base44.entities.FantasyMundialConfig.list(),
        base44.entities.FantasyMundial.list("-created_date", 500),
      ]);
      setConfig(configs?.[0] || null);
      setEntries(allEntries || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Fantasy Mundial</h1>
            <p className="text-sm text-slate-600">Gestión de inscripciones y puntuaciones</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.open('/Fantasy', '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" /> Ver página pública
        </Button>
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="entries">Inscripciones</TabsTrigger>
          <TabsTrigger value="ranking">Clasificación</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4">
          <FantasyAdminEntries entries={entries} config={config} onRefresh={load} />
        </TabsContent>
        <TabsContent value="ranking" className="mt-4">
          <FantasyLeaderboard entries={entries} />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <FantasyAdminConfig config={config} onSaved={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}