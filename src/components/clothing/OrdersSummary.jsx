import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Package, FileText, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function OrdersSummary({ orders }) {
  const generateSummaryPDF = () => {
    const jackets = {};
    const shirts = {};
    const pants = {};
    const sweatshirts = {};
    const chubasqueros = {};
    const anoraks = {};
    const mochilas = 0;
    
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
      
      if (order.camiseta_individual && order.camiseta_individual_talla) {
        shirts[order.camiseta_individual_talla] = (shirts[order.camiseta_individual_talla] || 0) + 1;
      }
      if (order.pantalon_individual && order.pantalon_individual_talla) {
        pants[order.pantalon_individual_talla] = (pants[order.pantalon_individual_talla] || 0) + 1;
      }
      if (order.sudadera_individual && order.sudadera_individual_talla) {
        sweatshirts[order.sudadera_individual_talla] = (sweatshirts[order.sudadera_individual_talla] || 0) + 1;
      }
      if (order.chubasquero && order.chubasquero_talla) {
        chubasqueros[order.chubasquero_talla] = (chubasqueros[order.chubasquero_talla] || 0) + 1;
      }
      if (order.anorak && order.anorak_talla) {
        anoraks[order.anorak_talla] = (anoraks[order.anorak_talla] || 0) + 1;
      }
    });
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resumen de Pedidos</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; }
            h1 { color: #22c55e; font-size: 24px; border-bottom: 3px solid #22c55e; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; font-size: 18px; background: #f0fdf4; padding: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #22c55e; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total { font-weight: bold; background-color: #f0fdf4 !important; font-size: 16px; }
            .header { text-align: center; margin-bottom: 20px; }
            .date { color: #666; font-size: 14px; }
            .print-button { 
              background: #22c55e; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              cursor: pointer; 
              font-size: 16px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .print-button:hover { background: #16a34a; }
            @media print { .print-button { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
          <div class="header">
            <h1>RESUMEN DE PEDIDOS - CD BUSTARVIEJO</h1>
            <p class="date">Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
    `;
    
    if (Object.keys(jackets).length > 0) {
      htmlContent += `
        <h2>🧥 CHAQUETAS DE PARTIDOS</h2>
        <table>
          <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
          <tbody>
      `;
      Object.entries(jackets).sort().forEach(([talla, qty]) => {
        htmlContent += `<tr><td>${talla}</td><td>${qty}</td></tr>`;
      });
      htmlContent += `<tr class="total"><td>TOTAL</td><td>${Object.values(jackets).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>`;
    }
    
    if (Object.keys(shirts).length > 0) {
      htmlContent += `
        <h2>👕 CAMISETAS ENTRENAMIENTO</h2>
        <table>
          <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
          <tbody>
      `;
      Object.entries(shirts).sort().forEach(([talla, qty]) => {
        htmlContent += `<tr><td>${talla}</td><td>${qty}</td></tr>`;
      });
      htmlContent += `<tr class="total"><td>TOTAL</td><td>${Object.values(shirts).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>`;
    }
    
    if (Object.keys(pants).length > 0) {
      htmlContent += `
        <h2>👖 PANTALONES ENTRENAMIENTO</h2>
        <table>
          <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
          <tbody>
      `;
      Object.entries(pants).sort().forEach(([talla, qty]) => {
        htmlContent += `<tr><td>${talla}</td><td>${qty}</td></tr>`;
      });
      htmlContent += `<tr class="total"><td>TOTAL</td><td>${Object.values(pants).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>`;
    }
    
    if (Object.keys(sweatshirts).length > 0) {
      htmlContent += `
        <h2>🧥 SUDADERAS ENTRENAMIENTO</h2>
        <table>
          <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
          <tbody>
      `;
      Object.entries(sweatshirts).sort().forEach(([talla, qty]) => {
        htmlContent += `<tr><td>${talla}</td><td>${qty}</td></tr>`;
      });
      htmlContent += `<tr class="total"><td>TOTAL</td><td>${Object.values(sweatshirts).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>`;
    }
    
    if (Object.keys(chubasqueros).length > 0) {
      htmlContent += `
        <h2>🌧️ CHUBASQUEROS</h2>
        <table>
          <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
          <tbody>
      `;
      Object.entries(chubasqueros).sort().forEach(([talla, qty]) => {
        htmlContent += `<tr><td>${talla}</td><td>${qty}</td></tr>`;
      });
      htmlContent += `<tr class="total"><td>TOTAL</td><td>${Object.values(chubasqueros).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>`;
    }
    
    if (Object.keys(anoraks).length > 0) {
      htmlContent += `
        <h2>🧥 ANORAKS</h2>
        <table>
          <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
          <tbody>
      `;
      Object.entries(anoraks).sort().forEach(([talla, qty]) => {
        htmlContent += `<tr><td>${talla}</td><td>${qty}</td></tr>`;
      });
      htmlContent += `<tr class="total"><td>TOTAL</td><td>${Object.values(anoraks).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>`;
    }
    
    htmlContent += `
          <script>
            // Auto-print on mobile devices
            if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const generateDetailedPDF = () => {
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Detalle de Pedidos</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; size: landscape; }
            }
            body { font-family: Arial, sans-serif; padding: 15px; }
            h1 { color: #22c55e; font-size: 20px; text-align: center; margin-bottom: 10px; }
            .date { text-align: center; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #22c55e; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .print-button { 
              background: #22c55e; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              cursor: pointer; 
              font-size: 16px;
              border-radius: 5px;
              margin-bottom: 15px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .print-button:hover { background: #16a34a; }
            @media print { .print-button { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
          <h1>DETALLE DE PEDIDOS POR FAMILIA - CD BUSTARVIEJO</h1>
          <p class="date">Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <table>
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Categoría</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Chaqueta</th>
                <th>Talla</th>
                <th>Pack</th>
                <th>Cam.</th>
                <th>Pant.</th>
                <th>Sud.</th>
                <th>Chub.</th>
                <th>Anorak</th>
                <th>Mochila</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    orders
      .filter(order => order.estado !== "Entregado")
      .forEach(order => {
        htmlContent += `
          <tr>
            <td>${order.jugador_nombre}</td>
            <td>${order.jugador_categoria}</td>
            <td>${order.email_padre}</td>
            <td>${order.telefono || '-'}</td>
            <td>${order.chaqueta_partidos ? "✓" : ""}</td>
            <td>${order.chaqueta_talla || "-"}</td>
            <td>${order.pack_entrenamiento ? "✓" : ""}</td>
            <td>${order.pack_camiseta_talla || "-"}</td>
            <td>${order.pack_pantalon_talla || "-"}</td>
            <td>${order.pack_sudadera_talla || "-"}</td>
            <td>${order.chubasquero ? order.chubasquero_talla : "-"}</td>
            <td>${order.anorak ? order.anorak_talla : "-"}</td>
            <td>${order.mochila ? "✓" : ""}</td>
            <td>${order.precio_total}€</td>
            <td>${order.estado}</td>
          </tr>
        `;
      });
    
    htmlContent += `
            </tbody>
          </table>
          <script>
            if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const generateSummaryCSV = () => {
    const jackets = {};
    const shirts = {};
    const pants = {};
    const sweatshirts = {};
    const chubasqueros = {};
    const anoraks = {};
    let mochilas = 0;
    
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
      
      if (order.camiseta_individual && order.camiseta_individual_talla) {
        shirts[order.camiseta_individual_talla] = (shirts[order.camiseta_individual_talla] || 0) + 1;
      }
      if (order.pantalon_individual && order.pantalon_individual_talla) {
        pants[order.pantalon_individual_talla] = (pants[order.pantalon_individual_talla] || 0) + 1;
      }
      if (order.sudadera_individual && order.sudadera_individual_talla) {
        sweatshirts[order.sudadera_individual_talla] = (sweatshirts[order.sudadera_individual_talla] || 0) + 1;
      }
      if (order.chubasquero && order.chubasquero_talla) {
        chubasqueros[order.chubasquero_talla] = (chubasqueros[order.chubasquero_talla] || 0) + 1;
      }
      if (order.anorak && order.anorak_talla) {
        anoraks[order.anorak_talla] = (anoraks[order.anorak_talla] || 0) + 1;
      }
      if (order.mochila) {
        mochilas++;
      }
    });
    
    const rows = [
      ["RESUMEN DE PEDIDOS - CD BUSTARVIEJO"],
      [""],
      ["CHAQUETAS DE PARTIDOS"],
      ["Talla", "Cantidad"]
    ];
    
    Object.entries(jackets).sort().forEach(([talla, qty]) => {
      rows.push([talla, qty]);
    });
    rows.push(["TOTAL CHAQUETAS", Object.values(jackets).reduce((a, b) => a + b, 0)]);
    
    rows.push([""], ["CAMISETAS ENTRENAMIENTO"], ["Talla", "Cantidad"]);
    Object.entries(shirts).sort().forEach(([talla, qty]) => {
      rows.push([talla, qty]);
    });
    rows.push(["TOTAL CAMISETAS", Object.values(shirts).reduce((a, b) => a + b, 0)]);
    
    rows.push([""], ["PANTALONES ENTRENAMIENTO"], ["Talla", "Cantidad"]);
    Object.entries(pants).sort().forEach(([talla, qty]) => {
      rows.push([talla, qty]);
    });
    rows.push(["TOTAL PANTALONES", Object.values(pants).reduce((a, b) => a + b, 0)]);
    
    rows.push([""], ["SUDADERAS ENTRENAMIENTO"], ["Talla", "Cantidad"]);
    Object.entries(sweatshirts).sort().forEach(([talla, qty]) => {
      rows.push([talla, qty]);
    });
    rows.push(["TOTAL SUDADERAS", Object.values(sweatshirts).reduce((a, b) => a + b, 0)]);
    
    if (Object.keys(chubasqueros).length > 0) {
      rows.push([""], ["CHUBASQUEROS"], ["Talla", "Cantidad"]);
      Object.entries(chubasqueros).sort().forEach(([talla, qty]) => {
        rows.push([talla, qty]);
      });
      rows.push(["TOTAL CHUBASQUEROS", Object.values(chubasqueros).reduce((a, b) => a + b, 0)]);
    }
    
    if (Object.keys(anoraks).length > 0) {
      rows.push([""], ["ANORAKS"], ["Talla", "Cantidad"]);
      Object.entries(anoraks).sort().forEach(([talla, qty]) => {
        rows.push([talla, qty]);
      });
      rows.push(["TOTAL ANORAKS", Object.values(anoraks).reduce((a, b) => a + b, 0)]);
    }
    
    if (mochilas > 0) {
      rows.push([""], ["MOCHILAS"], ["", "Cantidad"], ["Mochilas con botero", mochilas]);
    }
    
    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resumen_pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const generateDetailedCSV = () => {
    const rows = [
      ["DETALLE DE PEDIDOS POR FAMILIA - CD BUSTARVIEJO"],
      [""],
      ["Jugador", "Categoría", "Email", "Teléfono", "Chaqueta", "Talla Chaq", "Pack", "Cam", "Pant", "Sud", "Chub", "Anorak", "Mochila", "Total", "Estado"]
    ];
    
    orders
      .filter(order => order.estado !== "Entregado")
      .forEach(order => {
        rows.push([
          order.jugador_nombre,
          order.jugador_categoria,
          order.email_padre,
          order.telefono || "",
          order.chaqueta_partidos ? "SÍ" : "",
          order.chaqueta_talla || "",
          order.pack_entrenamiento ? "SÍ" : "",
          order.pack_camiseta_talla || "",
          order.pack_pantalon_talla || "",
          order.pack_sudadera_talla || "",
          order.chubasquero ? order.chubasquero_talla : "",
          order.anorak ? order.anorak_talla : "",
          order.mochila ? "SÍ" : "",
          order.precio_total,
          order.estado
        ]);
      });
    
    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_detallados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white">
                  <Download className="w-4 h-4 mr-2" />
                  Resumen para Proveedor
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={generateSummaryCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Descargar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={generateSummaryPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Descargar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white">
                  <Download className="w-4 h-4 mr-2" />
                  Detalle por Familia
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={generateDetailedCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Descargar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={generateDetailedPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Descargar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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