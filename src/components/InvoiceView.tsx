"use client";

import POSReceiptBill from "@/components/POSReceiptBill";

export interface InvoiceItem {
  name: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceData {
  orderRef: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal?: number;
  shipping?: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  createdAt: string;
  items: InvoiceItem[];
}

const paymentMethod: Record<string, string> = {
  cod: "cash",
  onepay: "card",
  reseller: "cod",
  pos_cash: "cash",
  pos_card: "card",
};

/** Use the POS bill for every order so preview and 80 mm print stay identical. */
export default function InvoiceView({ order }: { order: InvoiceData }) {
  const deliveryAddress = [order.address, order.district, order.province, order.postalCode]
    .filter(Boolean)
    .join(", ");
  const hasDelivery = Boolean(deliveryAddress || order.city || (order.shipping ?? 0) > 0);

  return (
    <POSReceiptBill
      receipt={{
        receiptNumber: order.orderRef,
        items: order.items,
        customerName: order.customerName,
        subtotal:
          order.subtotal ??
          Math.max(
            0,
            order.total -
              (order.shipping ?? 0) +
              (order.discountAmount ?? 0) -
              (order.taxAmount ?? 0),
          ),
        discountAmount: order.discountAmount ?? 0,
        taxAmount: order.taxAmount ?? 0,
        deliveryFee: hasDelivery ? order.shipping ?? 0 : undefined,
        total: order.total,
        paymentMethod: paymentMethod[order.paymentMethod] ?? order.paymentMethod,
        amountTendered: null,
        changeDue: null,
        fulfillmentType: hasDelivery ? "delivery" : undefined,
        deliveryAddress: hasDelivery ? deliveryAddress : null,
        deliveryCity: hasDelivery ? order.city : null,
        createdAt: order.createdAt,
      }}
    />
  );
}
