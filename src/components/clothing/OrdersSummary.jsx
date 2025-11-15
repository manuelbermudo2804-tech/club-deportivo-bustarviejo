import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OrdersSummary({ orders }) {
  const generateSummaryCSV = () => {
    const jackets = {};
    const shirts = {};
    const pants = {};
    const sweatshirts = {};
    
    orders.forEach(order => {
      if (order.estado === "Entregado") return;
      
      if (order.chaqueta_partidos && order.chaqueta_talla) {
        jackets[order.chaqueta_talla] = (jackets[order.chaqueta_talla] || 0) + 1;
      }
      
      if (order.pack_entrenamiento) {
        if (order.pack_camiseta_talla) {
          shirts[order.pack_camiseta_talla] = (shirts[order.pack_camiseta_talla] || 0) + 1;
        }
        if (order.pack_pantalon_talla) {
          pants[order.pack_pantalon_talla] = (pants[order.pack_pantalon_talla] || 0) + 1;
        }
        if (order.pack_sudadera_talla) {
          sweatshirts[order.pack_sudadera_talla] = (sweatshirts[order.pack_sudadera_talla] || 0) + 1;
        }
      }
    });
    
    const csvLines = [
      "RESUMEN DE PEDIDOS - CD BUSTARVIEJO",
      "",
      "CHAQUETAS DE PARTIDOS",
      "Talla,Cantidad"
    ];
    
    Object.entries(jackets).sort().forEach(([talla, qty]) => {
      csvLines.push(`${talla},${qty}`);
    });
    csvLines.push(`TOTAL CHAQUETAS,${Object.values(jackets).reduce((a, b) => a + b, 0)}`);
    
    csvLines.push("");
    csvLines.push("CAMISETAS ENTRENAMIENTO");
    csvLines.push("Talla,Cantidad");
    Object.entries(shirts).sort().forEach(([talla, qty]) => {
      csvLines.push(`${talla},${qty}`);
    });
    csvLines.push(`TOTAL CAMISETAS,${Object.values(shirts).reduce((a, b) => a + b, 0)}`);
    
    csvLines.push("");
    csvLines.push("PANTALONES ENTRENAMIENTO");
    csvLines.push("Talla,Cantidad");
    Object.entries(pants).sort().forEach(([talla, qty]) => {
      csvLines.push(`${talla},${qty}`);
    });
    csvLines.push(`TOTAL PANTALONES,${Object.values(pants).reduce((a, b) => a + b, 0)}`);
    
    csvLines.push("");
    csvLines.push("SUDADERAS ENTRENAMIENTO");
    csvLines.push("Talla,Cantidad");
    Object.entries(sweatshirts).sort().forEach(([talla, qty]) => {
      csvLines.push(`${talla},${qty}`);
    });
    csvLines.push(`TOTAL SUDADERAS,${Object.values(sweatshirts).reduce((a, b) => a + b, 0)}`);
    
    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `resumen_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateDetailedCSV = () => {
    const csvLines = [
      "DETALLE DE PEDIDOS POR FAMILIA - CD BUSTARVIEJO",
      "",
      "Jugador,Categoría,Email,Teléfono,Chaqueta,Talla Chaqueta,Pack,Camiseta,Pantalón,Sudadera,Total,Estado"
    ];
    
    orders
      .filter(order => order.estado !== "Entregado")
      .forEach(order => {
        csvLines.push([
          order.jugador_nombre,
          order.jugador_categoria,
          order.email_padre,
          order.telefono,
          order.chaqueta_partidos ? "SÍ" : "NO",
          order.chaqueta_talla || "-",
          order.pack_entrenamiento ? "SÍ" : "NO",
          order.pack_camiseta_talla || "-",
          order.pack_pantalon_talla || "-",
          order.pack_sudadera_talla || "-",
          order.precio_total + "€",
          order.estado
        ].join(','));
      });
    
    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_detallados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const jackets = {};
  const shirts = {};
  const pants = {};
  const sweatshirts = {};
  
  const activeOrders = orders.filter(o => o.estado !== "Entregado");
  
  activeOrders.forEach(order => {
    if (order.chaqueta_partidos && order.chaqueta_talla) {
      if (!jackets[order.chaqueta_talla]) {
        jackets[order.chaqueta_talla] = [];
      }
      jackets[order.chaqueta_talla].push(order.jugador_nombre);
    }
    
    if (order.pack_entrenamiento) {
      if (order.pack_camiseta_talla) {
        if (!shirts[order.pack_camiseta_talla]) {
          shirts[order.pack_camiseta_talla] = [];
        }
        shirts[order.pack_camiseta_talla].push(order.jugador_nombre);
      }
      if (order.pack_pantalon_talla) {
        if (!pants[order.pack_pantalon_talla]) {
          pants[order.pack_pantalon_talla] = [];
        }
        pants[order.pack_pantalon_talla].push(order.jugador_nombre);
      }
      if (order.pack_sudadera_talla) {
        if (!sweatshirts[order.pack_sudadera_talla]) {
          sweatshirts[order.pack_sudadera_talla] = [];
        }
        sweatshirts[order.pack_sudadera_talla].push(order.jugador_nombre);
      }
    }
  });

  const totalJackets = Object.values(jackets).reduce((acc, arr) => acc + arr.length, 0);
  const totalShirts = Object.values(shirts).reduce((acc, arr) => acc + arr.length, 0);
  const totalPants = Object.values(pants).reduce((acc, arr) => acc + arr.length, 0);
  const totalSweatshirts = Object.values(sweatshirts).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
      <CardHeader className="border-b border-green-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Package className="w-6 h-6 text-green-700" />
            📦 Resumen de Pedidos Agrupados
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={generateSummaryCSV}
              variant="outline"
              size="sm"
              className="bg-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Resumen para Proveedor
            </Button>
            <Button
              onClick={generateDetailedCSV}
              variant="outline"
              size="sm"
              className="bg-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Detalle por Familia
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {activeOrders.length === 0 ? (
          <p className="text-center text-green-800 py-8">No hay pedidos activos</p>
        ) : (
          <>
            {/* Chaquetas */}
            {totalJackets > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                <h3 className="font-bold text-lg text-green-900 mb-3 flex items-center gap-2">
                  🧥 Chaquetas de Partidos 
                  <Badge className="bg-green-600 text-white">{totalJackets} unidades</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(jackets).sort().map(([talla, nombres]) => (
                    <div key={talla} className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <p className="font-semibold text-green-900 mb-2">
                        {talla} <Badge className="ml-2 bg-green-600">{nombres.length}</Badge>
                      </p>
                      <div className="text-xs text-green-800 space-y-1">
                        {nombres.map((nombre, idx) => (
                          <p key={idx}>• {nombre}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Camisetas */}
            {totalShirts > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                <h3 className="font-bold text-lg text-blue-900 mb-3 flex items-center gap-2">
                  👕 Camisetas de Entrenamiento
                  <Badge className="bg-blue-600 text-white">{totalShirts} unidades</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(shirts).sort().map(([talla, nombres]) => (
                    <div key={talla} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="font-semibold text-blue-900 mb-2">
                        {talla} <Badge className="ml-2 bg-blue-600">{nombres.length}</Badge>
                      </p>
                      <div className="text-xs text-blue-800 space-y-1">
                        {nombres.map((nombre, idx) => (
                          <p key={idx}>• {nombre}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pantalones */}
            {totalPants > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                <h3 className="font-bold text-lg text-purple-900 mb-3 flex items-center gap-2">
                  👖 Pantalones de Entrenamiento
                  <Badge className="bg-purple-600 text-white">{totalPants} unidades</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(pants).sort().map(([talla, nombres]) => (
                    <div key={talla} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="font-semibold text-purple-900 mb-2">
                        {talla} <Badge className="ml-2 bg-purple-600">{nombres.length}</Badge>
                      </p>
                      <div className="text-xs text-purple-800 space-y-1">
                        {nombres.map((nombre, idx) => (
                          <p key={idx}>• {nombre}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sudaderas */}
            {totalSweatshirts > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                <h3 className="font-bold text-lg text-orange-900 mb-3 flex items-center gap-2">
                  🧥 Sudaderas de Entrenamiento
                  <Badge className="bg-orange-600 text-white">{totalSweatshirts} unidades</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(sweatshirts).sort().map(([talla, nombres]) => (
                    <div key={talla} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <p className="font-semibold text-orange-900 mb-2">
                        {talla} <Badge className="ml-2 bg-orange-600">{nombres.length}</Badge>
                      </p>
                      <div className="text-xs text-orange-800 space-y-1">
                        {nombres.map((nombre, idx) => (
                          <p key={idx}>• {nombre}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}