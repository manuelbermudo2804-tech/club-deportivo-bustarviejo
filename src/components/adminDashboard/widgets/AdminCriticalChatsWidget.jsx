import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminCriticalChatsWidget() {
  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["adminCriticalChatsWidget"],
    queryFn: async () => {
      const all = await base44.entities.AdminConversation.filter({});
      return all.filter(c => !c.resuelta);
    },
    staleTime: 30000,
  });

  const count = convs.length;
  return (
    <Card className="bg-white/90 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-900 font-bold">Conversaciones críticas</p>
              <p className="text-slate-500 text-sm">Escaladas sin resolver</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{isLoading ? "…" : count}</div>
        </div>
        <div className="mt-3 flex justify-end">
          <Link to={createPageUrl("AdminChat")}>
            <Button variant="outline" className="gap-1">
              Ver <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}