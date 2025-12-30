import React from "react";
import AdminPaymentsReviewWidget from "./widgets/AdminPaymentsReviewWidget";
import AdminSignaturesPendingWidget from "./widgets/AdminSignaturesPendingWidget";
import AdminCriticalChatsWidget from "./widgets/AdminCriticalChatsWidget";
import AdminClothingOrdersWidget from "./widgets/AdminClothingOrdersWidget";
import { CreditCard, FileSignature, ShieldAlert, ShoppingBag } from "lucide-react";

// Catálogo de widgets disponibles para ADMIN
export const adminWidgetRegistry = [
  {
    key: "payments_review",
    title: "Pagos en revisión",
    icon: CreditCard,
    component: AdminPaymentsReviewWidget,
    defaultCols: 1,
    defaultProps: {}
  },
  {
    key: "signatures_pending",
    title: "Firmas pendientes",
    icon: FileSignature,
    component: AdminSignaturesPendingWidget,
    defaultCols: 1,
    defaultProps: {}
  },
  {
    key: "critical_chats",
    title: "Conversaciones críticas",
    icon: ShieldAlert,
    component: AdminCriticalChatsWidget,
    defaultCols: 1,
    defaultProps: {}
  },
  {
    key: "clothing_orders",
    title: "Pedidos de ropa",
    icon: ShoppingBag,
    component: AdminClothingOrdersWidget,
    defaultCols: 1,
    defaultProps: {}
  }
];

export const getAdminDefaultWidgets = () => (
  adminWidgetRegistry.slice(0, 3).map((w, idx) => ({
    key: w.key,
    order: idx,
    cols: w.defaultCols || 1,
    enabled: true,
    props: w.defaultProps || {}
  }))
);