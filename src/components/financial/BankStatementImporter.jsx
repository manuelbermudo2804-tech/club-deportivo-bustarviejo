import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertTriangle, Loader2, CalendarDays, Wallet, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

function money(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let raw = String(value).trim().replaceAll("€", "").replaceAll(" ", "").replaceAll(String.fromCharCode(160), "");
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    raw = comma > dot ? raw.split(".").join("").replace(",", ".") : raw.split(",").join("");
  } else if (comma >= 0) {
    raw = raw.length - comma - 1 === 2
      ? raw.split(".").join("").replace(",", ".")
      : raw.split(",").join("");
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
const moneyText = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value) || 0);

function normalizeDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeMovement(raw) {
  const fecha = normalizeDate(raw.fecha || raw.date);
  const concepto = String(raw.concepto || raw.concept || raw.descripcion || "").replace(/\s+/g, " ").trim();
  let amount = money(raw.importe ?? raw.cantidad ?? raw.amount ?? raw.importe_eur);
  const balanceAfter = money(raw.saldo_despues ?? raw.saldo ?? raw.balance_after);
  if (!fecha || !concepto || amount === null || amount === 0) return null;
  const kind = String(raw.tipo || raw.type || "").toLowerCase();
  const expense = /gasto|cargo|debit|expense|salida/.test(kind);
  const income = /ingreso|abono|credit|income|entrada/.test(kind);
  // El signo explícito prevalece; si el extracto entrega importes positivos con tipo, se respeta el tipo.
  if (amount > 0 && expense) amount = -amount;
  else if (amount < 0 && income) amount = Math.abs(amount);
  return {
    fecha,
    concepto,
    signedAmount: amount,
    importe: Math.abs(amount),
    tipo: amount < 0 ? "gasto" : "ingreso",
    saldo_despues: balanceAfter
  };
}

function normalizeConcept(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function movementSignature(mov) {
  return [
    mov.fecha,
    normalizeConcept(mov.concepto),
    Math.abs(Number(mov.importe ?? mov.cantidad ?? 0)).toFixed(2),
    String(mov.tipo || (Number(mov.importe ?? mov.cantidad ?? 0) < 0 ? "gasto" : "ingreso")).toLowerCase()
  ].join("|");
}

function guessCategory(mov, rules = []) {
  const concept = normalizeConcept(mov.concepto);
  const txType = mov.tipo === "ingreso" ? "Ingreso" : "Gasto";
  const rule = rules.find((item) =>
    item.activa !== false &&
    item.tipo_transaccion === txType &&
    normalizeConcept(item.patron_concepto) &&
    concept.includes(normalizeConcept(item.patron_concepto))
  );
  const validIncome = ["Cuotas Socios", "Inscripciones", "Subvenciones", "Patrocinios", "Venta Equipación", "Eventos", "Lotería", "Otros Ingresos"];
  const validExpense = ["Material Deportivo", "Equipación", "Arbitrajes", "Desplazamientos", "Instalaciones", "Mantenimiento", "Seguros", "Federación", "Personal", "Suministros", "Marketing", "Eventos y Celebraciones", "Otros Gastos"];
  const allowed = txType === "Ingreso" ? validIncome : validExpense;
  if (rule && allowed.includes(rule.categoria_destino)) return { categoria: rule.categoria_destino, fromRule: true };
  if (txType === "Ingreso") {
    if (/subvencion|ayuntamiento|comunidad de madrid/.test(concept)) return { categoria: "Subvenciones", fromRule: false };
    if (/patrocin|sponsor/.test(concept)) return { categoria: "Patrocinios", fromRule: false };
    if (/loteria|loteria/.test(concept)) return { categoria: "Lotería", fromRule: false };
    if (/equipacion|ropa deportiva/.test(concept)) return { categoria: "Venta Equipación", fromRule: false };
    if (/socio|cuota socio/.test(concept)) return { categoria: "Cuotas Socios", fromRule: false };
    if (/cuota|inscripcion|mensualidad|jugador|equipo/.test(concept)) return { categoria: "Inscripciones", fromRule: false };
    return { categoria: "Otros Ingresos", fromRule: false };
  }
  if (/nomina|sueldo|coordinador|entrenador|personal/.test(concept)) return { categoria: "Personal", fromRule: false };
  if (/federacion/.test(concept)) return { categoria: "Federación", fromRule: false };
  if (/arbitro|arbitraje/.test(concept)) return { categoria: "Arbitrajes", fromRule: false };
  if (/seguro|aseguradora/.test(concept)) return { categoria: "Seguros", fromRule: false };
  if (/luz|agua|electricidad|telefono|internet|suministro/.test(concept)) return { categoria: "Suministros", fromRule: false };
  if (/marketing|publicidad|instagram/.test(concept)) return { categoria: "Marketing", fromRule: false };
  if (/instalacion|campo|pista/.test(concept)) return { categoria: "Instalaciones", fromRule: false };
  if (/mantenimiento|reparacion/.test(concept)) return { categoria: "Mantenimiento", fromRule: false };
  if (/material deportivo|balones|conos/.test(concept)) return { categoria: "Material Deportivo", fromRule: false };
  if (/equipacion|ropa deportiva/.test(concept)) return { categoria: "Equipación", fromRule: false };
  if (/evento|celebracion|torneo/.test(concept)) return { categoria: "Eventos y Celebraciones", fromRule: false };
  if (/desplazamiento|autobus|combustible|gasolina/.test(concept)) return { categoria: "Desplazamientos", fromRule: false };
  return { categoria: "Otros Gastos", fromRule: false };
}

function budgetPartidaName(category) {
  const names = {
    "Inscripciones": "Inscripciones Jugadores",
    "Cuotas Socios": "Cuotas Socios",
    "Subvenciones": "Subvenciones Ayuntamiento",
    "Patrocinios": "Patrocinios",
    "Venta Equipación": "Venta Equipación",
    "Eventos": "Eventos y Torneos",
    "Lotería": "Lotería Navidad",
    "Otros Ingresos": "Otros Ingresos",
    "Material Deportivo": "Material Deportivo",
    "Equipación": "Equipación",
    "Arbitrajes": "Arbitrajes",
    "Desplazamientos": "Desplazamientos",
    "Instalaciones": "Mantenimiento Instalaciones",
    "Mantenimiento": "Mantenimiento Instalaciones",
    "Seguros": "Seguros",
    "Federación": "Federación (Fichas)",
    "Personal": "Personal/Entrenadores",
    "Suministros": "Suministros (Agua, Luz)",
    "Marketing": "Marketing",
    "Eventos y Celebraciones": "Eventos y Torneos",
    "Otros Gastos": "Otros Gastos"
  };
  return names[category] || category;
}

function needsManualSettlementReview(concept) {
  const normalized = normalizeConcept(concept);
  return /stripe.*(payout|transfer|liquid|settlement)|payout.*stripe|liquidacion.*stripe|traspaso entre cuentas|transferencia entre cuentas|cuenta propia|traspaso propio/.test(normalized);
}

export default function BankStatementImporter({ activeSeason, accountId, account }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [movements, setMovements] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");

  const { data: sessions = [] } = useQuery({
    queryKey: ["reconciliationSessions", accountId],
    queryFn: () => base44.entities.ReconciliationSession.list("-created_date", 100),
    enabled: !!accountId
  });

  const { data: existingMovements = [] } = useQuery({
    queryKey: ["bankMovements", accountId],
    queryFn: () => base44.entities.BankMovement.filter({ cuenta_bancaria: accountId }),
    enabled: !!accountId
  });

  const accountSessions = useMemo(
    () => sessions.filter((s) => s.cuenta_bancaria === accountId && s.fecha_fin).sort((a, b) => String(b.fecha_fin).localeCompare(String(a.fecha_fin))),
    [sessions, accountId]
  );
  const lastSession = accountSessions[0];
  const latestMovementDate = existingMovements
    .map((movement) => normalizeDate(movement.fecha))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0] || "";
  const latestKnownEnd = lastSession?.fecha_fin || latestMovementDate;
  const suggestedStart = latestKnownEnd ? addDays(latestKnownEnd, 1) : "";
  const nextDateText = lastSession
    ? `La última importación registrada termina el ${new Date(lastSession.fecha_fin + "T12:00:00").toLocaleDateString("es-ES")}. El siguiente período recomendado comienza el ${new Date(suggestedStart + "T12:00:00").toLocaleDateString("es-ES")}.`
    : latestMovementDate
    ? `No hay sesión de extracto guardada, pero el último movimiento histórico es del ${new Date(latestMovementDate + "T12:00:00").toLocaleDateString("es-ES")}. Como orientación, el siguiente período comenzaría el ${new Date(suggestedStart + "T12:00:00").toLocaleDateString("es-ES")}; revisa que coincida con tu extracto.`
    : "Primera importación registrada para esta cuenta. El sistema guardará las fechas de este extracto para orientar las siguientes cargas.";

  const normalizedMovements = useMemo(
    () => movements.map(normalizeMovement).filter(Boolean).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [movements]
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setExtractionWarning("");
    setMovements([]);
    setFileUrl("");
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      const uploadedUrl = uploaded?.file_url;
      if (!uploadedUrl) throw new Error("No se ha recibido la URL del archivo subido.");
      setFileUrl(uploadedUrl);
      setUploading(false);
      setExtracting(true);

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedUrl,
        json_schema: {
          type: "object",
          properties: {
            fecha_inicio: { type: "string", description: "Fecha inicial del período del extracto, en formato YYYY-MM-DD si aparece" },
            fecha_fin: { type: "string", description: "Fecha final del período del extracto, en formato YYYY-MM-DD si aparece" },
            saldo_inicial: { type: "number", description: "Saldo de la cuenta inmediatamente antes del primer movimiento del período. No uses el saldo que aparece después del primer movimiento." },
            saldo_final: { type: "number", description: "Saldo final de cierre del extracto si aparece claramente en el resumen. No uses el saldo consolidado si difiere del saldo real/disponible." },
            movimientos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fecha: { type: "string" },
                  concepto: { type: "string" },
                  cantidad: { type: "number" },
                  saldo_despues: { type: "number", description: "Saldo de la cuenta inmediatamente después de este movimiento, si aparece en el extracto" },
                  tipo: { type: "string", description: "Ingreso/abono o gasto/cargo; conserva el signo del importe si el archivo lo incluye" }
                },
                required: ["fecha", "concepto", "cantidad"]
              }
            }
          },
          required: ["movimientos"]
        }
      });

      const output = result?.output || {};
      if (result?.status !== "success" || !Array.isArray(output.movimientos) || output.movimientos.length === 0) {
        throw new Error("No se han podido extraer movimientos válidos. Prueba con el extracto CSV o Excel del banco.");
      }
      const valid = output.movimientos.map(normalizeMovement).filter(Boolean).sort((a, b) => a.fecha.localeCompare(b.fecha));
      if (!valid.length) throw new Error("El archivo se ha leído, pero no contiene movimientos con fecha, concepto e importe válidos.");
      setMovements(output.movimientos);
      const minDate = valid[0].fecha;
      const maxDate = valid[valid.length - 1].fecha;
      const firstWithBalance = valid.find((movement) => movement.saldo_despues !== null);
      const lastWithBalance = [...valid].reverse().find((movement) => movement.saldo_despues !== null);
      const inferredOpening = firstWithBalance
        ? Number((firstWithBalance.saldo_despues - firstWithBalance.signedAmount).toFixed(2))
        : null;
      const extractedOpening = money(output.saldo_inicial);
      const extractedOpeningLooksLikeFirstRowBalance = extractedOpening !== null && firstWithBalance &&
        Math.abs(extractedOpening - firstWithBalance.saldo_despues) < 0.02 &&
        inferredOpening !== null && Math.abs(inferredOpening - extractedOpening) >= 0.02;
      const resolvedOpening = extractedOpeningLooksLikeFirstRowBalance ? inferredOpening : extractedOpening ?? inferredOpening;
      const extractedClosing = money(output.saldo_final);
      const resolvedClosing = lastWithBalance?.saldo_despues ?? extractedClosing;
      setPeriodStart(normalizeDate(output.fecha_inicio) || suggestedStart || minDate);
      setPeriodEnd(normalizeDate(output.fecha_fin) || maxDate);
      setOpeningBalance(resolvedOpening !== null ? String(resolvedOpening.toFixed(2)) : "");
      setClosingBalance(resolvedClosing !== null ? String(resolvedClosing.toFixed(2)) : "");
      const balanceHeaderDiffers = extractedClosing !== null && lastWithBalance &&
        Math.abs(extractedClosing - lastWithBalance.saldo_despues) >= 0.02;
      const periodMissing = !output.fecha_inicio || !output.fecha_fin;
      if (periodMissing || balanceHeaderDiffers) {
        setExtractionWarning([
          periodMissing ? "El archivo no ha proporcionado claramente el período completo. Revisa las fechas propuestas." : "",
          balanceHeaderDiffers ? "El saldo final del encabezado no coincide con el saldo tras el último movimiento. Se propone el saldo de la última fila; compruébalo antes de importar." : ""
        ].filter(Boolean).join(" "));
      }
      toast.success(`${valid.length} movimientos válidos extraídos`);
    } catch (error) {
      console.error("Error leyendo extracto bancario:", error);
      toast.error(error?.message || "Error procesando el extracto bancario");
      setMovements([]);
    } finally {
      setUploading(false);
      setExtracting(false);
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!accountId || !account?.id) {
      toast.error("Selecciona una cuenta bancaria válida.");
      return;
    }
    if (!fileUrl || !normalizedMovements.length) {
      toast.error("Primero selecciona y analiza un extracto.");
      return;
    }
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      toast.error("Revisa las fechas de inicio y fin del extracto.");
      return;
    }
    const outsidePeriod = normalizedMovements.filter((m) => m.fecha < periodStart || m.fecha > periodEnd);
    if (outsidePeriod.length) {
      toast.error(`Hay ${outsidePeriod.length} movimiento(s) fuera del período indicado. Corrige las fechas antes de importar.`);
      return;
    }

    setImporting(true);
    try {
      const [allPayments, user, allTransactions, reconciliationRules] = await Promise.all([
        base44.entities.Payment.filter({ temporada: activeSeason?.temporada }).catch(() => []),
        base44.auth.me(),
        base44.entities.FinancialTransaction.list("-fecha").catch(() => []),
        base44.entities.ReconciliationRule.list("-veces_aplicada").catch(() => [])
      ]);
      const existing = await base44.entities.BankMovement.filter({ cuenta_bancaria: accountId });
      const existingCounts = new Map();
      existing.forEach((m) => {
        const normalized = {
          fecha: normalizeDate(m.fecha),
          concepto: m.concepto,
          importe: Math.abs(Number(m.importe) || 0),
          tipo: String(m.tipo || "").toLowerCase() === "gasto" || Number(m.importe) < 0 ? "gasto" : "ingreso"
        };
        const key = movementSignature(normalized);
        existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
      });

      const importSession = await base44.entities.ReconciliationSession.create({
        extracto_url: fileUrl,
        movimientos_totales: normalizedMovements.length,
        movimientos_reconciliados: 0,
        movimientos_pendientes: normalizedMovements.length,
        admin_email: user?.email || "no-disponible",
        completada: false,
        fecha_inicio: periodStart,
        fecha_fin: periodEnd,
        cuenta_bancaria: accountId,
        archivo_nombre: fileName,
        movimientos_duplicados: 0,
        movimientos_omitidos: 0
      });

      const incomingCounts = new Map();
      const usedPaymentIds = new Set();
      const usedTransactionIds = new Set();
      let importedCount = 0;
      let duplicateCount = 0;
      let matchedCount = 0;
      let reconciledCount = 0;
      let netNew = 0;
      let allNet = 0;

      for (const mov of normalizedMovements) {
        allNet += mov.signedAmount;
        const key = movementSignature(mov);
        const occurrence = (incomingCounts.get(key) || 0) + 1;
        incomingCounts.set(key, occurrence);
        if (occurrence <= (existingCounts.get(key) || 0)) {
          duplicateCount++;
          continue;
        }

        const concept = mov.concepto.toLowerCase();
        const matchingPayment = mov.tipo === "ingreso" ? allPayments.find((p) => {
          const playerName = String(p.jugador_nombre || "").trim().toLowerCase();
          const paymentAmount = Math.abs(Number(p.cantidad || 0));
          const amountMatch = Math.abs(paymentAmount - mov.importe) < 0.02;
          const conceptMatch = playerName.length > 2 && concept.includes(playerName);
          return amountMatch && conceptMatch && !p.reconciliado_banco && !usedPaymentIds.has(p.id);
        }) : null;

        const normalizedConcept = normalizeConcept(mov.concepto);
        const transactionCandidates = matchingPayment ? [] : allTransactions.filter((tx) => {
          if (tx.bank_movement_id || existing.some((item) => item.financial_transaction_id === tx.id) || usedTransactionIds.has(tx.id)) return false;
          if (tx.tipo !== (mov.tipo === "ingreso" ? "Ingreso" : "Gasto")) return false;
          if (normalizeDate(tx.fecha) !== mov.fecha) return false;
          if (Math.abs(Math.abs(Number(tx.cantidad) || 0) - mov.importe) >= 0.02) return false;
          return true;
        });
        const matchingTransaction = transactionCandidates.find((tx) => {
          const txConcept = normalizeConcept(tx.concepto);
          return txConcept === normalizedConcept ||
            (txConcept.length > 5 && normalizedConcept.length > 5 && (txConcept.includes(normalizedConcept) || normalizedConcept.includes(txConcept)));
        }) || (transactionCandidates.length === 1 ? transactionCandidates[0] : null);
        const amountOnlyTransactionMatch = !!matchingTransaction &&
          !(() => {
            const txConcept = normalizeConcept(matchingTransaction.concepto);
            return txConcept === normalizedConcept ||
              (txConcept.length > 5 && normalizedConcept.length > 5 && (txConcept.includes(normalizedConcept) || normalizedConcept.includes(txConcept)));
          })();
        const ambiguousTransaction = !matchingTransaction && transactionCandidates.length > 0;

        const possiblePendingPayments = !matchingPayment && mov.tipo === "ingreso"
          ? allPayments.filter((payment) =>
              payment.is_deleted !== true &&
              !["Pagado", "Anulado"].includes(payment.estado) &&
              Math.abs(Math.abs(Number(payment.cantidad) || 0) - mov.importe) < 0.02
            )
          : [];
        const ambiguousPayment = possiblePendingPayments.length > 0;
        const manualSettlement = !matchingPayment && !matchingTransaction &&
          (needsManualSettlementReview(mov.concepto) || ambiguousPayment);
        let createdTransaction = null;
        let categoryGuess = null;
        if (!matchingPayment && !matchingTransaction && !manualSettlement) {
          categoryGuess = guessCategory(mov, reconciliationRules);
          createdTransaction = await base44.entities.FinancialTransaction.create({
            tipo: mov.tipo === "ingreso" ? "Ingreso" : "Gasto",
            concepto: mov.concepto,
            cantidad: mov.importe,
            fecha: mov.fecha,
            categoria: categoryGuess.categoria,
            partida_nombre: budgetPartidaName(categoryGuess.categoria),
            estado: mov.tipo === "ingreso" ? "Cobrado" : "Pagado",
            temporada: activeSeason?.temporada,
            automatico: true,
            referencia_origen: `bank-import:${accountId}:${key}`,
            revisar_clasificacion: !categoryGuess.fromRule,
            notas: categoryGuess.fromRule
              ? "Importado desde extracto y clasificado mediante regla de conciliación."
              : "Importado desde extracto. Categoría provisional: revisar antes de cerrar la contabilidad."
          });
        }

        const linkedTransaction = matchingTransaction || createdTransaction;
        const now = new Date().toISOString();
        const createdMovement = await base44.entities.BankMovement.create({
          cuenta_bancaria: accountId,
          reconciliation_session_id: importSession.id,
          fecha: mov.fecha,
          concepto: mov.concepto,
          importe: mov.importe,
          tipo: mov.tipo,
          ...(mov.saldo_despues !== null ? { saldo_despues: mov.saldo_despues } : {}),
          reconciliado: !!matchingPayment || !!matchingTransaction || !!createdTransaction,
          payment_id: matchingPayment?.id || undefined,
          financial_transaction_id: linkedTransaction?.id || undefined,
          jugador_nombre: matchingPayment?.jugador_nombre || undefined,
          confianza_match: matchingPayment || matchingTransaction ? 95 : createdTransaction ? 80 : 0,
          fecha_reconciliacion: matchingPayment || matchingTransaction || createdTransaction ? now : undefined,
          notas_reconciliacion: matchingPayment
            ? "Conciliado con una cuota existente por nombre e importe."
            : matchingTransaction
            ? "Vinculado a una transacción financiera existente."
            : createdTransaction
            ? "Transacción financiera creada y vinculada. Revisar categoría si está marcada como provisional."
            : manualSettlement
            ? ambiguousPayment
              ? "Posible cuota pendiente de identificar por importe. Revisar manualmente; no se crea otro ingreso para evitar duplicidades."
              : "Liquidación de Stripe o traspaso interno: revisar y vincular sin contabilizar de nuevo."
            : "Pendiente de revisión manual."
        });
        importedCount++;
        netNew += mov.signedAmount;

        if (matchingPayment) {
          usedPaymentIds.add(matchingPayment.id);
          await base44.entities.Payment.update(matchingPayment.id, {
            estado: "Pagado",
            fecha_pago: mov.fecha,
            reconciliado_banco: true,
            fecha_reconciliacion: now
          });
          matchedCount++;
          reconciledCount++;
        } else if (matchingTransaction) {
          usedTransactionIds.add(matchingTransaction.id);
          await base44.entities.FinancialTransaction.update(matchingTransaction.id, {
            estado: mov.tipo === "ingreso" ? "Cobrado" : "Pagado",
            bank_movement_id: createdMovement?.id || undefined,
            notas: [matchingTransaction.notas, `Conciliado con extracto bancario: ${mov.concepto}`].filter(Boolean).join("\\n")
          });
          reconciledCount++;
        } else if (createdTransaction) {
          if (createdMovement?.id) {
            await base44.entities.FinancialTransaction.update(createdTransaction.id, {
              bank_movement_id: createdMovement.id,
              referencia_origen: createdMovement.id
            });
          }
          reconciledCount++;
        }
      }

      const accountRecords = await base44.entities.BankAccount.list();
      const accountRecord = accountRecords.find((item) => item.id === account.id) || account;
      const parsedClosing = closingBalance.trim() === "" ? null : Number(closingBalance);
      const parsedOpening = openingBalance.trim() === "" ? null : Number(openingBalance);
      if (parsedClosing !== null && !Number.isFinite(parsedClosing)) throw new Error("El saldo final del extracto no es válido.");
      if (parsedOpening !== null && !Number.isFinite(parsedOpening)) throw new Error("El saldo inicial del extracto no es válido.");

      const isHistoricalBackfill = Boolean(
        (lastSession?.fecha_fin && (periodEnd < lastSession.fecha_fin || (periodEnd === lastSession.fecha_fin && parsedClosing === null))) ||
        (!lastSession && latestMovementDate && periodEnd < latestMovementDate)
      );
      let saldoCalculado = Number(accountRecord?.saldo_actual ?? account?.saldo_actual) || 0;
      if (isHistoricalBackfill) {
        // Un extracto anterior puede completar el histórico, pero nunca debe retroceder el saldo actual.
        saldoCalculado = Number(accountRecord?.saldo_actual ?? account?.saldo_actual ?? accountRecord?.saldo_inicial ?? 0) || 0;
      } else if (parsedClosing !== null) {
        saldoCalculado = parsedClosing;
      } else if (accountSessions.length === 0) {
        const legacyNet = existing.reduce((sum, item) => {
          const amount = Math.abs(Number(item.importe) || 0);
          const kind = String(item.tipo || "").toLowerCase() === "gasto" || Number(item.importe) < 0 ? -1 : 1;
          return sum + amount * kind;
        }, 0);
        saldoCalculado = (Number(accountRecord?.saldo_inicial ?? account?.saldo_inicial) || 0) + legacyNet + netNew;
      } else {
        saldoCalculado = (Number(accountRecord?.saldo_actual ?? account?.saldo_actual) || 0) + netNew;
      }

      const reconciliationExpected = parsedOpening !== null ? parsedOpening + allNet : null;
      const discrepancy = parsedClosing !== null && reconciliationExpected !== null
        ? Number((parsedClosing - reconciliationExpected).toFixed(2))
        : null;

      if (!isHistoricalBackfill) {
        await base44.entities.BankAccount.update(account.id, {
          saldo_actual: Number(saldoCalculado.toFixed(2)),
          ultima_conciliacion: new Date().toISOString()
        });
      }

      await base44.entities.ReconciliationSession.update(importSession.id, {
        movimientos_totales: importedCount,
        movimientos_reconciliados: reconciledCount,
        movimientos_pendientes: Math.max(0, importedCount - reconciledCount),
        movimientos_duplicados: duplicateCount,
        movimientos_omitidos: 0,
        completada: true,
        ...(parsedOpening !== null ? { saldo_inicial_extracto: parsedOpening } : {}),
        ...(parsedClosing !== null ? { saldo_final_extracto: parsedClosing } : {}),
        ...(reconciliationExpected !== null ? { saldo_calculado_extracto: reconciliationExpected } : {}),
        ...(discrepancy !== null ? { diferencia_saldos: discrepancy } : {}),
        importe_neto_importado: Number(netNew.toFixed(2))
      });

      if (activeSeason?.temporada) {
        const budgets = await base44.entities.Budget.list("-created_date").catch(() => []);
        await Promise.all(
          budgets
            .filter((budget) => budget.activo !== false && budget.temporada === activeSeason.temporada)
            .map((budget) => base44.functions.invoke("updateBudgetExecuted", { budgetId: budget.id }).catch((error) => {
              console.warn("No se pudo actualizar el ejecutado del presupuesto tras importar el banco:", error?.message || error);
              return null;
            }))
        );
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bankMovements"] }),
        queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }),
        queryClient.invalidateQueries({ queryKey: ["cashForecastBankAccounts"] }),
        queryClient.invalidateQueries({ queryKey: ["cashForecastFinancialTransactions"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["cashForecastPayments"] }),
        queryClient.invalidateQueries({ queryKey: ["reconciliationSessions"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] })
      ]);

      if (discrepancy !== null && Math.abs(discrepancy) > 0.02) {
        toast.warning(`Importación completada, pero el extracto presenta un descuadre de ${moneyText(discrepancy)}. Revisa el período y los movimientos.`);
      } else if (isHistoricalBackfill) {
        toast.warning(`Extracto histórico incorporado: ${importedCount} movimientos nuevos y ${duplicateCount} duplicados omitidos. El saldo actual no se ha modificado porque el período es anterior.`);
      } else {
        toast.success(`Importación completada: ${importedCount} nuevos, ${duplicateCount} duplicados omitidos, ${matchedCount} cuotas vinculadas. Saldo registrado: ${moneyText(saldoCalculado)}.`);
      }
      setMovements([]);
      setFileName("");
      setFileUrl("");
      setPeriodStart("");
      setPeriodEnd("");
      setOpeningBalance("");
      setClosingBalance("");
      setExtractionWarning("");
    } catch (error) {
      console.error("Error importando extracto:", error);
      toast.error(error?.message || "No se ha podido completar la importación. Comprueba la cuenta y vuelve a intentarlo.");
    } finally {
      setImporting(false);
    }
  };

  const signedTotal = normalizedMovements.reduce((sum, m) => sum + m.signedAmount, 0);
  const incomeTotal = normalizedMovements.filter((m) => m.tipo === "ingreso").reduce((sum, m) => sum + m.importe, 0);
  const expenseTotal = normalizedMovements.filter((m) => m.tipo === "gasto").reduce((sum, m) => sum + m.importe, 0);

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Importar extracto bancario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Control de períodos</p>
              <p className="mt-1 text-sm text-blue-800">{nextDateText}</p>
              {lastSession && (
                <div className="mt-2 grid gap-1 text-xs text-blue-900 sm:grid-cols-2">
                  <p>Último período: {lastSession.fecha_inicio} – {lastSession.fecha_fin}</p>
                  <p>Movimientos nuevos: {Number(lastSession.movimientos_totales) || 0} · Duplicados omitidos: {Number(lastSession.movimientos_duplicados) || 0}</p>
                  <p>Pendientes de revisar: {Number(lastSession.movimientos_pendientes) || 0}</p>
                  {lastSession.diferencia_saldos !== undefined && <p>Diferencia de saldos: {moneyText(lastSession.diferencia_saldos)}</p>}
                </div>
              )}
              <p className="mt-1 text-xs text-blue-700">Si los extractos se solapan, los movimientos ya importados se detectan y se omiten.</p>
            </div>
          </div>
        </div>

        <div>
          <Input type="file" accept=".csv,.txt,.pdf,.xls,.xlsx" onChange={handleFileUpload} disabled={uploading || extracting || importing} />
          <p className="mt-1 text-xs text-slate-500">Recomendado: CSV o Excel descargado directamente del banco. También admite PDF y TXT.</p>
        </div>

        {(uploading || extracting || importing) && (
          <div className="py-4 text-center">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">
              {uploading ? "Subiendo archivo..." : extracting ? "Leyendo movimientos, fechas y saldos..." : "Importando, conciliando y actualizando saldos..."}
            </p>
          </div>
        )}

        {movements.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Inicio del período *</label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fin del período *</label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Saldo inicial del extracto (€)</label>
                <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Si aparece en el extracto" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Saldo final del extracto (€)</label>
                <Input type="number" step="0.01" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="Si aparece en el extracto" />
              </div>
            </div>

            {extractionWarning && <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" />{extractionWarning}</div>}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-700">Movimientos válidos</p><p className="text-xl font-bold text-blue-900">{normalizedMovements.length}</p></div>
              <div className="rounded-lg bg-green-50 p-3"><p className="text-xs text-green-700">Ingresos</p><p className="text-lg font-bold text-green-800">{moneyText(incomeTotal)}</p></div>
              <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">Gastos</p><p className="text-lg font-bold text-red-800">{moneyText(expenseTotal)}</p></div>
              <div className="rounded-lg bg-slate-100 p-3"><p className="text-xs text-slate-600">Neto del extracto</p><p className="text-lg font-bold text-slate-900">{moneyText(signedTotal)}</p></div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="h-4 w-4" />Vista previa · {fileName}</p>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {normalizedMovements.slice(0, 12).map((mov, idx) => (
                  <div key={`${mov.fecha}-${idx}`} className="flex items-start justify-between gap-3 rounded border bg-white p-2 text-xs">
                    <div><p className="font-medium">{mov.concepto}</p><p className="text-slate-500">{new Date(mov.fecha + "T12:00:00").toLocaleDateString("es-ES")}</p></div>
                    <span className={mov.tipo === "ingreso" ? "whitespace-nowrap font-semibold text-green-700" : "whitespace-nowrap font-semibold text-red-700"}>{mov.tipo === "ingreso" ? "+" : "−"}{moneyText(mov.importe)}</span>
                  </div>
                ))}
                {normalizedMovements.length > 12 && <p className="text-center text-xs text-slate-500">Y {normalizedMovements.length - 12} movimientos más.</p>}
              </div>
            </div>

            <Button onClick={handleImport} disabled={importing || uploading || extracting || !periodStart || !periodEnd} className="w-full bg-blue-600 hover:bg-blue-700">
              {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Importar y actualizar saldo</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
