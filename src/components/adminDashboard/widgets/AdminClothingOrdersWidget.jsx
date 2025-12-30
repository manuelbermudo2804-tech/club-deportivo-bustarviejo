import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminClothingOrdersWidget() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["adminClothingOrdersWidget"],
    queryFn: async () => {
      const all = await base44.entities.ClothingOrder.list("-created_date", 500);
      return all.filter(o => o.estado === "En revisión" || o.estado === "Pendiente");
    },
    staleTime: 60000,
  });

  const count = orders.length;

  return (
    <Card className="bg-white/90 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-900 font-bold">Pedidos de ropa</p>
              <p className="text-slate-500 text-sm">Pendientes / en revisión</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{isLoading ? "…" : count}</div>
        </div>
        <div className="mt-3 flex justify-end">
          <Link to={createPageUrl("ClothingOrders")}>
            <Button variant="outline" className="gap-1">
              Gestionar <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}