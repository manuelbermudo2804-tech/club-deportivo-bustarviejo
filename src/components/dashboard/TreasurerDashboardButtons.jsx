import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CreditCard, Bell, Archive, ShoppingBag, Clover, Users } from "lucide-react";

export default function TreasurerDashboardButtons() {
  const [loteriaVisible, setLoteriaVisible] = useState(false);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  useEffect(() => {
    if (seasonConfig) {
      setLoteriaVisible(seasonConfig.loteria_navidad_abierta === true);
    }
  }, [seasonConfig]);

  const buttons = [
    {
      title: "💳 Pagos del Club",
      url: createPageUrl("Payments"),
      icon: CreditCard,
      gradient: "from-green-600 to-green-700",
    },
    {
      title: "🔔 Recordatorios",
      url: createPageUrl("PaymentReminders"),
      icon: Bell,
      gradient: "from-red-600 to-orange-700",
    },
    {
      title: "📁 Histórico",
      url: createPageUrl("PaymentHistory"),
      icon: Archive,
      gradient: "from-slate-600 to-slate-700",
    },
    {
      title: "🛍️ Pedidos Ropa",
      url: createPageUrl("ClothingOrders"),
      icon: ShoppingBag,
      gradient: "from-teal-600 to-teal-700",
    },
    {
      title: "🎫 Socios",
      url: createPageUrl("ClubMembersManagement"),
      icon: Users,
      gradient: "from-pink-600 to-pink-700",
    },
  ];

  if (loteriaVisible) {
    buttons.push({
      title: "🍀 Lotería",
      url: createPageUrl("LotteryManagement"),
      icon: Clover,
      gradient: "from-green-600 to-green-700",
    });
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-3">⚡ Acceso Rápido Tesorero</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {buttons.map((button, index) => (
          <Link key={index} to={button.url} className="group">
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border-2 border-slate-200 hover:border-orange-500 hover:scale-105 active:scale-95">
              <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${button.gradient} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`}></div>
              
              <div className="relative z-10 p-4 flex flex-col items-center justify-center min-h-[120px]">
                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${button.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                  <button.icon className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                
                <h3 className="text-slate-900 font-bold text-center text-sm">
                  {button.title}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}