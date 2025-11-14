import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action, idx) => (
        <Link key={idx} to={action.url}>
          <Card className="border-2 border-transparent hover:border-orange-500 transition-all hover:shadow-lg cursor-pointer group h-full">
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-3xl group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">
                {action.title}
              </p>
              {action.badge > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {action.badge}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}