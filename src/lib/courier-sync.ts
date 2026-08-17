import "server-only";

import { query } from "@/lib/db";
import { trackOrder, mapKoombiyoStatus } from "@/lib/koombiyo";
import { sendOrderStatusSms } from "@/lib/sms";
import { sendOrderEmail } from "@/lib/mail";

const BATCH_SIZE = 50;

type CourierOrder = {
  order_ref: string;
  customer_phone: string | null;
  customer_email: string | null;
  total: string;
  koombiyo_waybill_id: string;
  koombiyo_status: string | null;
  status: string;
  reseller_id?: number | null;
  profit?: string | null;
};

type PosDelivery = {
  receipt_number: string;
  customer_phone: string | null;
  koombiyo_waybill_id: string;
  koombiyo_status: string | null;
  delivery_status: string | null;
};

export interface CourierSyncResult {
  synced: number;
  changed: number;
  failed: number;
  skipped: boolean;
}

function posStatus(status: string): string {
  if (["delivered", "returned", "cancelled"].includes(status)) return status;
  if (status === "shipped") return "out_for_delivery";
  return "accepted";
}

async function notifyOrder(order: CourierOrder, status: string, reseller: boolean) {
  const tasks: Promise<unknown>[] = [sendOrderStatusSms(order.customer_phone, order.order_ref, status)];
  if (order.customer_email) {
    tasks.push(sendOrderEmail(order.customer_email, { orderRef: order.order_ref, total: Number(order.total), status }));
  }
  if (reseller && order.reseller_id) {
    const owners = await query<{ phone: string | null; email: string | null }>(
      "SELECT phone, email FROM users WHERE id = ? LIMIT 1", [order.reseller_id]
    );
    if (owners[0]?.phone) tasks.push(sendOrderStatusSms(owners[0].phone, order.order_ref, status));
    if (owners[0]?.email) {
      tasks.push(sendOrderEmail(owners[0].email, { orderRef: order.order_ref, total: Number(order.total), status }));
    }
  }
  await Promise.allSettled(tasks);
}

async function syncOrders(table: "orders" | "reseller_orders", reseller: boolean, result: CourierSyncResult) {
  const rows = await query<CourierOrder>(
    `SELECT order_ref, customer_phone, customer_email, ${reseller ? "amount" : "total"} AS total,
            koombiyo_waybill_id, koombiyo_status, status${reseller ? ", reseller_id, profit" : ""}
     FROM ${table}
     WHERE deleted_at IS NULL AND koombiyo_waybill_id IS NOT NULL
       AND status NOT IN ('delivered', 'returned', 'cancelled')
     ORDER BY COALESCE(koombiyo_updated_at, created_at) ASC LIMIT ${BATCH_SIZE}`
  );

  for (const order of rows) {
    try {
      const tracking = await trackOrder(order.koombiyo_waybill_id);
      const status = mapKoombiyoStatus(tracking.status);
      const changed = order.status !== status || order.koombiyo_status !== tracking.status;
      await query(
        `UPDATE ${table} SET koombiyo_status = ?, koombiyo_response = ?, koombiyo_updated_at = NOW(),
         status = ?, payment_status = IF(? = 'delivered', 'paid', payment_status),
         ${reseller
           ? "wallet_credited_at = IF(? = 'delivered', COALESCE(wallet_credited_at, NOW()), wallet_credited_at)"
           : "paid_at = IF(? = 'delivered', COALESCE(paid_at, NOW()), paid_at)"}
         WHERE order_ref = ? AND deleted_at IS NULL`,
        [tracking.status, JSON.stringify(tracking.raw), status, status, status, order.order_ref]
      );
      if (reseller && status === "delivered" && order.reseller_id) {
        await query(
          `INSERT IGNORE INTO reseller_wallet_transactions
           (reseller_id, type, amount, reference_type, reference_id, description)
           VALUES (?,'credit',?,'order',?,'Reseller order profit')`,
          [order.reseller_id, Number(order.profit || 0), order.order_ref]
        );
      }
      result.synced++;
      if (changed) {
        result.changed++;
        if (order.status !== status) await notifyOrder(order, status, reseller);
      }
    } catch (error) {
      result.failed++;
      console.error(`Courier sync failed for ${order.order_ref}:`, error);
    }
  }
}

async function syncPosDeliveries(result: CourierSyncResult) {
  const rows = await query<PosDelivery>(
    `SELECT receipt_number, customer_phone, koombiyo_waybill_id, koombiyo_status, delivery_status
     FROM pos_sales
     WHERE deleted_at IS NULL AND fulfillment_type = 'delivery' AND koombiyo_waybill_id IS NOT NULL
       AND COALESCE(delivery_status, '') NOT IN ('delivered', 'returned', 'cancelled')
     ORDER BY COALESCE(koombiyo_updated_at, created_at) ASC LIMIT ${BATCH_SIZE}`
  );
  for (const sale of rows) {
    try {
      const tracking = await trackOrder(sale.koombiyo_waybill_id);
      const nextStatus = posStatus(mapKoombiyoStatus(tracking.status));
      const changed = sale.delivery_status !== nextStatus || sale.koombiyo_status !== tracking.status;
      await query(
        `UPDATE pos_sales SET koombiyo_status = ?, koombiyo_response = ?, koombiyo_updated_at = NOW(), delivery_status = ?
         WHERE receipt_number = ? AND deleted_at IS NULL`,
        [tracking.status, JSON.stringify(tracking.raw), nextStatus, sale.receipt_number]
      );
      result.synced++;
      if (changed) {
        result.changed++;
        if (sale.delivery_status !== nextStatus) await sendOrderStatusSms(sale.customer_phone, sale.receipt_number, nextStatus);
      }
    } catch (error) {
      result.failed++;
      console.error(`Courier sync failed for POS sale ${sale.receipt_number}:`, error);
    }
  }
}

/** Pulls the latest Koombiyo status and sends a notification only on a status change. */
export async function syncCourierUpdates(): Promise<CourierSyncResult> {
  const result: CourierSyncResult = { synced: 0, changed: 0, failed: 0, skipped: false };
  const locks = await query<{ acquired: number }>("SELECT GET_LOCK('beyos_koombiyo_sync', 0) AS acquired");
  if (!locks[0]?.acquired) return { ...result, skipped: true };
  try {
    await syncOrders("orders", false, result);
    await syncOrders("reseller_orders", true, result);
    await syncPosDeliveries(result);
    return result;
  } finally {
    await query("SELECT RELEASE_LOCK('beyos_koombiyo_sync')");
  }
}
