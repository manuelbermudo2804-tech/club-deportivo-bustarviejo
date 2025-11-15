import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const generatePaymentReference = (playerName, playerCategory) => {
  if (!playerName || !playerCategory) return "";
  const categoryCode = playerCategory.split(' ')[1] || "CLUB";
  const cleanName = playerName.trim().replace(/\s+/g, '_').toUpperCase();
  return `${categoryCode}-${cleanName}`;
};

export default function BankReconciliation({ payments, players, onReconcile }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [matchedPayments, setMatchedPayments] = useState([]);

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/[,;]/);
      
      if (parts.length >= 3) {
        const date = parts[0]?.trim();
        const concept = parts[1]?.trim() || '';
        const amountStr = parts[2]?.trim();
        
        const amount = parseFloat(amountStr.replace(/[^\d.,]/g, '').replace(',', '.'));
        
        if (!isNaN(amount) && amount > 0 && concept) {
          transactions.push({
            date,
            concept,
            amount
          });
        }
      }
    }
    
    return transactions;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const transactions = parseCSV(text);
      
      if (transactions.length === 0) {
        toast.error("No se encontraron transacciones válidas en el archivo");
        setUploading(false);
        return;
      }

      setBankTransactions(transactions);
      toast.success(`${transactions.length} transacciones cargadas del extracto`);
      
      // Auto-match
      matchTransactions(transactions);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("Error al procesar el archivo. Asegúrate de que sea un CSV válido.");
    }
    setUploading(false);
  };

  const matchTransactions = (transactions) => {
    const matches = [];
    
    const pendingPayments = payments.filter(p => 
      (p.estado === "Pendiente" || p.estado === "En revisión") && !p.reconciliado_banco
    );

    transactions.forEach(transaction => {
      pendingPayments.forEach(payment => {
        const player = players.find(pl => pl.id === payment.jugador_id);
        if (!player) return;

        const expectedReference = generatePaymentReference(payment.jugador_nombre, player.deporte);
        
        // Match by reference and amount
        const conceptMatch = transaction.concept.toUpperCase().includes(expectedReference.toUpperCase());
        const amountMatch = Math.abs(transaction.amount - payment.cantidad) < 0.01;
        
        if (conceptMatch && amountMatch) {
          matches.push({
            transaction,
            payment,
            player,
            confidence: 100
          });
        } else if (conceptMatch || amountMatch) {
          // Partial match
          const confidence = conceptMatch ? 70 : 50;
          matches.push({
            transaction,
            payment,
            player,
            confidence
          });
        }
      });
    });

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    setMatchedPayments(matches);
    
    if (matches.length > 0) {
      toast.success(`${matches.length} pagos coinciden con transacciones bancarias`);
    }
  };

  const handleReconcile = async (match) => {
    setProcessing(true);
    try {
      await base44.entities.Payment.update(match.payment.id, {
        ...match.payment,
        estado: "Pagado",
        reconciliado_banco: true,
        fecha_reconciliacion: new Date().toISOString(),
        fecha_pago: match.transaction.date,
        notas: `${match.payment.notas || ''}\n\nReconciliado automáticamente con extracto bancario el ${new Date().toLocaleDateString()}`
      });

      toast.success(`✅ Pago de ${match.payment.jugador_nombre} reconciliado`);
      
      // Remove from matches
      setMatchedPayments(matchedPayments.filter(m => m.payment.id !== match.payment.id));
      
      if (onReconcile) onReconcile();
    } catch (error) {
      console.error("Error reconciling payment:", error);
      toast.error("Error al reconciliar el pago");
    }
    setProcessing(false);
  };

  const handleReconcileAll = async () => {
    const highConfidenceMatches = matchedPayments.filter(m => m.confidence >= 90);
    
    if (highConfidenceMatches.length === 0) {
      toast.info("No hay coincidencias de alta confianza para reconciliar automáticamente");
      return;
    }

    setProcessing(true);
    let successCount = 0;

    for (const match of highConfidenceMatches) {
      try {
        await base44.entities.Payment.update(match.payment.id, {
          ...match.payment,
          estado: "Pagado",
          reconciliado_banco: true,
          fecha_reconciliacion: new Date().toISOString(),
          fecha_pago: match.transaction.date,
          notas: `${match.payment.notas || ''}\n\nReconciliado automáticamente con extracto bancario el ${new Date().toLocaleDateString()}`
        });
        successCount++;
      } catch (error) {
        console.error("Error reconciling payment:", error);
      }
    }

    toast.success(`✅ ${successCount} pagos reconciliados automáticamente`);
    setMatchedPayments(matchedPayments.filter(m => m.confidence < 90));
    setProcessing(false);
    
    if (onReconcile) onReconcile();
  };

  const downloadTemplate = () => {
    const csv = `Fecha,Concepto,Importe
2025-01-15,PRE-BENJAMIN-JUAN_PEREZ,50.00
2025-01-16,ALEVIN-MARIA_GARCIA,60.00`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_extracto_bancario.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            Reconciliación Bancaria Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Alert className="bg-blue-50 border-blue-300">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>📋 Instrucciones:</strong>
              <ol className="mt-2 space-y-1 text-sm ml-4 list-decimal">
                <li>Descarga el extracto bancario desde tu banco online (formato CSV o Excel)</li>
                <li>Asegúrate de que incluya: Fecha, Concepto y Importe</li>
                <li>Súbelo aquí para reconciliación automática con los conceptos únicos</li>
                <li>La app emparejará automáticamente las transferencias con los pagos pendientes</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={() => document.getElementById('bank-file-upload').click()}
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Extracto Bancario
                </>
              )}
            </Button>
            <input
              id="bank-file-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              variant="outline"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>

          {bankTransactions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-900">
                ✅ <strong>{bankTransactions.length}</strong> transacciones cargadas del extracto bancario
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {matchedPayments.length > 0 && (
        <Card className="border-none shadow-xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                Coincidencias Encontradas ({matchedPayments.length})
              </CardTitle>
              <Button
                onClick={handleReconcileAll}
                disabled={processing || matchedPayments.filter(m => m.confidence >= 90).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Reconciliar Automáticas ({matchedPayments.filter(m => m.confidence >= 90).length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Transacción Bancaria</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Confianza</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedPayments.map((match, index) => (
                    <TableRow key={index} className={match.confidence >= 90 ? 'bg-green-50' : 'bg-yellow-50'}>
                      <TableCell className="font-medium">{match.payment.jugador_nombre}</TableCell>
                      <TableCell>{match.payment.mes}</TableCell>
                      <TableCell className="font-bold">{match.payment.cantidad}€</TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={match.transaction.concept}>
                        {match.transaction.concept}
                      </TableCell>
                      <TableCell className="text-sm">{match.transaction.date}</TableCell>
                      <TableCell>
                        <Badge className={
                          match.confidence >= 90 ? 'bg-green-500 text-white' :
                          match.confidence >= 70 ? 'bg-yellow-500 text-white' :
                          'bg-orange-500 text-white'
                        }>
                          {match.confidence}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleReconcile(match)}
                          disabled={processing}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {processing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Confirmar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}