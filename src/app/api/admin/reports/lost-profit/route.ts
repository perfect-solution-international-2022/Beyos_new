import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";
import { estimateUnitCost } from "@/lib/report-costs";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";

function parseRange(searchParams: URLSearchParams) {
  const end = searchParams.get("end") || new Date().toISOString().slice(0, 10);
  const startDefault = new Date();
  startDefault.setDate(startDefault.getDate() - 29);
  const start = searchParams.get("start") || startDefault.toISOString().slice(0, 10);
  return { start, end };
}

export type LeakKey = "price_concessions" | "manual_discounts" | "delivery_subsidy" | "stock_write_offs" | "cancellations";

/** One thing that cost the business profit, kept flat so every rollup below is one reduce. */
interface Leak {
  key: LeakKey;
  date: string;
  amount: number;
  channel: "pos" | "website" | "reseller" | "stock";
  reference: string;
  label: string;
  detail: string;
  units: number;
  slug: string | null;
}

const CHANNEL_SQL = {
  pos: "s.deleted_at IS NULL AND s.status = 'completed' AND COALESCE(s.delivery_status, '') <> 'cancelled'",
  website: "o.deleted_at IS NULL AND o.status IN ('completed','delivered')",
} as const;

export async function GET(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { start, end } = parseRange(searchParams);
  const range: [string, string] = [start, end];

  try {
    const leaks: Leak[] = [];

    // ---- 1. Price concessions: sold below the product's list price ----
    // Wholesale, bulk and sale pricing all land here. Mostly deliberate, but it
    // is the largest number on this page and the owner should see its size.
    const posPriceRows = await query<{
      slug: string; name: string; quantity: number; unit_price: string;
      list_price: string | null; sale_date: string; reference: string;
    }>(
      `SELECT psi.product_slug AS slug, psi.name, psi.quantity, psi.unit_price,
              COALESCE(v.price, p.price) AS list_price,
              DATE(s.created_at) AS sale_date, s.receipt_number AS reference
       FROM pos_sale_items psi
       JOIN pos_sales s ON s.id = psi.sale_id
       LEFT JOIN products p ON p.slug = psi.product_slug
       LEFT JOIN product_variants v ON v.id = psi.variant_id
       WHERE ${CHANNEL_SQL.pos} AND DATE(s.created_at) BETWEEN ? AND ?`,
      range
    );
    const websitePriceRows = await query<{
      slug: string; name: string; quantity: number; unit_price: string;
      list_price: string | null; sale_date: string; reference: string;
    }>(
      `SELECT oi.product_slug AS slug, oi.name, oi.quantity, oi.unit_price,
              COALESCE(v.price, p.price) AS list_price,
              DATE(o.created_at) AS sale_date, o.order_ref AS reference
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.slug = oi.product_slug
       LEFT JOIN product_variants v ON v.id = oi.variant_id
       WHERE ${CHANNEL_SQL.website} AND DATE(o.created_at) BETWEEN ? AND ?`,
      range
    );
    for (const [rows, channel] of [[posPriceRows, "pos"], [websitePriceRows, "website"]] as const) {
      for (const r of rows) {
        if (r.list_price === null) continue;
        const gap = (Number(r.list_price) - Number(r.unit_price)) * r.quantity;
        if (gap <= 0) continue;
        leaks.push({
          key: "price_concessions", date: r.sale_date, amount: gap, channel,
          reference: r.reference, label: r.name, units: r.quantity, slug: r.slug,
          detail: `Sold at ${Number(r.unit_price).toFixed(2)} vs list ${Number(r.list_price).toFixed(2)}`,
        });
      }
    }

    // ---- 2. Manual discounts keyed in at the register / promo codes ----
    const posDiscountRows = await query<{ reference: string; discount_amount: string; sale_date: string; customer_name: string | null }>(
      `SELECT s.receipt_number AS reference, s.discount_amount, DATE(s.created_at) AS sale_date, s.customer_name
       FROM pos_sales s
       WHERE ${CHANNEL_SQL.pos} AND s.discount_amount > 0 AND DATE(s.created_at) BETWEEN ? AND ?`,
      range
    );
    for (const r of posDiscountRows) {
      leaks.push({
        key: "manual_discounts", date: r.sale_date, amount: Number(r.discount_amount), channel: "pos",
        reference: r.reference, label: r.customer_name || "Walk-in customer", units: 0, slug: null,
        detail: "Discount applied at the register",
      });
    }
    const orderDiscountRows = await query<{ reference: string; discount: string; order_date: string; promo_code: string | null }>(
      `SELECT o.order_ref AS reference, o.discount, DATE(o.created_at) AS order_date, o.promo_code
       FROM orders o
       WHERE ${CHANNEL_SQL.website} AND o.discount > 0 AND DATE(o.created_at) BETWEEN ? AND ?`,
      range
    );
    for (const r of orderDiscountRows) {
      leaks.push({
        key: "manual_discounts", date: r.order_date, amount: Number(r.discount), channel: "website",
        reference: r.reference, label: r.promo_code ? `Promo ${r.promo_code}` : "Order discount", units: 0, slug: null,
        detail: r.promo_code ? "Promo code redeemed" : "Discount applied at checkout",
      });
    }

    // ---- 3. Delivery subsidy: what the courier weight would have charged vs what we billed ----
    const pricing = await getDeliveryPricing();
    const posDeliveryRows = await query<{ reference: string; delivery_fee: string; weight: string | null; sale_date: string; offer_name: string | null }>(
      `SELECT s.receipt_number AS reference, s.delivery_fee, DATE(s.created_at) AS sale_date,
              SUM(COALESCE(v.weight_kg, p.weight_kg, 0) * psi.quantity) AS weight,
              MAX(dos.offer_name) AS offer_name
       FROM pos_sales s
       JOIN pos_sale_items psi ON psi.sale_id = s.id
       LEFT JOIN products p ON p.slug = psi.product_slug
       LEFT JOIN product_variants v ON v.id = psi.variant_id
       LEFT JOIN delivery_offer_snapshots dos ON dos.channel = 'pos' AND dos.order_reference = s.receipt_number
       WHERE ${CHANNEL_SQL.pos} AND s.fulfillment_type = 'delivery' AND DATE(s.created_at) BETWEEN ? AND ?
       GROUP BY s.id`,
      range
    );
    const websiteDeliveryRows = await query<{ reference: string; delivery_fee: string; weight: string | null; sale_date: string; offer_name: string | null }>(
      `SELECT o.order_ref AS reference, o.shipping AS delivery_fee, DATE(o.created_at) AS sale_date,
              SUM(COALESCE(v.weight_kg, p.weight_kg, 0) * oi.quantity) AS weight,
              MAX(dos.offer_name) AS offer_name
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.slug = oi.product_slug
       LEFT JOIN product_variants v ON v.id = oi.variant_id
       LEFT JOIN delivery_offer_snapshots dos ON dos.channel = 'website' AND dos.order_reference = o.order_ref
       WHERE ${CHANNEL_SQL.website} AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY o.id`,
      range
    );
    const resellerDeliveryRows = await query<{ reference: string; delivery_fee: string; weight: string | null; sale_date: string; offer_name: string | null }>(
      `SELECT ro.order_ref AS reference, ro.delivery_fee, DATE(ro.created_at) AS sale_date,
              SUM(COALESCE(v.weight_kg, p.weight_kg, 0) * roi.quantity) AS weight,
              MAX(dos.offer_name) AS offer_name
       FROM reseller_orders ro
       JOIN reseller_order_items roi ON roi.order_id = ro.id
       LEFT JOIN products p ON p.slug = roi.product_slug
       LEFT JOIN product_variants v ON v.id = roi.variant_id
       LEFT JOIN delivery_offer_snapshots dos ON dos.channel = 'reseller' AND dos.order_reference = ro.order_ref
       WHERE ro.deleted_at IS NULL AND ro.status IN ('completed','delivered') AND DATE(ro.created_at) BETWEEN ? AND ?
       GROUP BY ro.id`,
      range
    );
    for (const [rows, channel] of [[posDeliveryRows, "pos"], [websiteDeliveryRows, "website"], [resellerDeliveryRows, "reseller"]] as const) {
      for (const r of rows) {
        const standard = computeDeliveryFee(Number(r.weight ?? 0), pricing);
        const subsidy = standard - Number(r.delivery_fee);
        if (subsidy <= 0) continue;
        leaks.push({
          key: "delivery_subsidy", date: r.sale_date, amount: subsidy, channel,
          reference: r.reference, label: r.offer_name || "Below weight-based rate", units: 0, slug: null,
          detail: `Charged ${Number(r.delivery_fee).toFixed(2)} vs weight-based ${standard.toFixed(2)}`,
        });
      }
    }

    // ---- 4. Stock written off: damaged, lost, removed from sale ----
    const writeOffRows = await query<{
      slug: string | null; product_name: string; units: number; note: string | null;
      production_cost: string | null; unit_price: string | null; movement_date: string; id: number;
    }>(
      `SELECT p.slug, sm.product_name, -sm.quantity_change AS units, sm.note, sm.id,
              COALESCE(v.production_cost, p.production_cost) AS production_cost,
              COALESCE(v.price, p.price) AS unit_price,
              DATE(sm.created_at) AS movement_date
       FROM stock_movements sm
       LEFT JOIN products p ON p.id = sm.product_id
       LEFT JOIN product_variants v ON v.id = sm.variant_id
       WHERE sm.movement_type = 'stock_out' AND sm.quantity_change < 0
         AND DATE(sm.created_at) BETWEEN ? AND ?`,
      range
    );
    for (const r of writeOffRows) {
      const unitCost = estimateUnitCost(Number(r.unit_price ?? 0), r.production_cost);
      const amount = unitCost * r.units;
      if (amount <= 0) continue;
      leaks.push({
        key: "stock_write_offs", date: r.movement_date, amount, channel: "stock",
        reference: `SM-${r.id}`, label: r.product_name, units: r.units, slug: r.slug,
        detail: r.note?.trim() ? r.note.trim() : "Stock removed",
      });
    }

    // ---- 5. Cancelled orders: the margin that never landed ----
    const cancelledPos = await query<{ reference: string; sale_date: string; revenue: string; cost: string }>(
      `SELECT s.receipt_number AS reference, DATE(s.created_at) AS sale_date,
              SUM(psi.line_total) AS revenue,
              SUM(COALESCE(v.production_cost, p.production_cost, psi.unit_price * 0.55) * psi.quantity) AS cost
       FROM pos_sales s
       JOIN pos_sale_items psi ON psi.sale_id = s.id
       LEFT JOIN products p ON p.slug = psi.product_slug
       LEFT JOIN product_variants v ON v.id = psi.variant_id
       WHERE s.deleted_at IS NULL AND (s.status IN ('cancelled','refunded','voided') OR s.delivery_status = 'cancelled')
         AND DATE(s.created_at) BETWEEN ? AND ?
       GROUP BY s.id`,
      range
    );
    const cancelledWebsite = await query<{ reference: string; sale_date: string; revenue: string; cost: string }>(
      `SELECT o.order_ref AS reference, DATE(o.created_at) AS sale_date,
              SUM(oi.line_total) AS revenue,
              SUM(COALESCE(v.production_cost, p.production_cost, oi.unit_price * 0.55) * oi.quantity) AS cost
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.slug = oi.product_slug
       LEFT JOIN product_variants v ON v.id = oi.variant_id
       WHERE o.deleted_at IS NULL AND o.status = 'cancelled' AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY o.id`,
      range
    );
    const cancelledReseller = await query<{ reference: string; sale_date: string; profit: string }>(
      `SELECT ro.order_ref AS reference, DATE(ro.created_at) AS sale_date, ro.profit
       FROM reseller_orders ro
       WHERE ro.deleted_at IS NULL AND ro.status IN ('cancelled','rejected') AND DATE(ro.created_at) BETWEEN ? AND ?`,
      range
    );
    for (const [rows, channel] of [[cancelledPos, "pos"], [cancelledWebsite, "website"]] as const) {
      for (const r of rows) {
        const margin = Number(r.revenue) - Number(r.cost);
        if (margin <= 0) continue;
        leaks.push({
          key: "cancellations", date: r.sale_date, amount: margin, channel,
          reference: r.reference, label: "Cancelled order", units: 0, slug: null,
          detail: `Margin on ${Number(r.revenue).toFixed(2)} of cancelled sales`,
        });
      }
    }
    for (const r of cancelledReseller) {
      const margin = Number(r.profit);
      if (margin <= 0) continue;
      leaks.push({
        key: "cancellations", date: r.sale_date, amount: margin, channel: "reseller",
        reference: r.reference, label: "Rejected reseller order", units: 0, slug: null,
        detail: "Reseller order never completed",
      });
    }

    // ---- Earned profit, for scale ----
    const earnedRows = await query<{ revenue: string; cost: string }>(
      `SELECT SUM(psi.line_total) AS revenue,
              SUM(COALESCE(v.production_cost, p.production_cost, psi.unit_price * 0.55) * psi.quantity) AS cost
       FROM pos_sale_items psi
       JOIN pos_sales s ON s.id = psi.sale_id
       LEFT JOIN products p ON p.slug = psi.product_slug
       LEFT JOIN product_variants v ON v.id = psi.variant_id
       WHERE ${CHANNEL_SQL.pos} AND DATE(s.created_at) BETWEEN ? AND ?`,
      range
    );
    const earnedWebsiteRows = await query<{ revenue: string; cost: string }>(
      `SELECT SUM(oi.line_total) AS revenue,
              SUM(COALESCE(v.production_cost, p.production_cost, oi.unit_price * 0.55) * oi.quantity) AS cost
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.slug = oi.product_slug
       LEFT JOIN product_variants v ON v.id = oi.variant_id
       WHERE ${CHANNEL_SQL.website} AND DATE(o.created_at) BETWEEN ? AND ?`,
      range
    );
    const earnedProfit = [...earnedRows, ...earnedWebsiteRows].reduce(
      (sum, r) => sum + (Number(r.revenue ?? 0) - Number(r.cost ?? 0)),
      0
    );

    // ---- Rollups ----
    const totalLost = leaks.reduce((s, l) => s + l.amount, 0);

    const bucketMeta: Record<LeakKey, { label: string; description: string; tone: string; action: string }> = {
      price_concessions: {
        label: "Price concessions", tone: "amber",
        description: "Sold below list price — wholesale, bulk and sale pricing.",
        action: "Review which products are discounted hardest and whether the volume justifies it.",
      },
      manual_discounts: {
        label: "Manual discounts", tone: "purple",
        description: "Discounts keyed in at the register and promo codes redeemed.",
        action: "Check whether register discounts are being given consistently.",
      },
      delivery_subsidy: {
        label: "Delivery subsidy", tone: "blue",
        description: "Delivery charged below the weight-based rate, mostly from the quantity offer.",
        action: "Compare against the extra sales the offer brings in.",
      },
      stock_write_offs: {
        label: "Stock write-offs", tone: "red",
        description: "Damaged, lost or removed stock, valued at production cost.",
        action: "The clearest pure loss here — worth tracing the cause of each one.",
      },
      cancellations: {
        label: "Cancelled orders", tone: "slate",
        description: "Margin on orders that were cancelled, refunded or rejected.",
        action: "Look for a pattern in why orders fall through.",
      },
    };
    const buckets = (Object.keys(bucketMeta) as LeakKey[]).map((key) => {
      const rows = leaks.filter((l) => l.key === key);
      const amount = rows.reduce((s, l) => s + l.amount, 0);
      return {
        key,
        ...bucketMeta[key],
        amount,
        count: rows.length,
        sharePct: totalLost > 0 ? (amount / totalLost) * 100 : 0,
        top: rows
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 8)
          .map((l) => ({ reference: l.reference, label: l.label, detail: l.detail, date: l.date, amount: l.amount, channel: l.channel, units: l.units })),
      };
    }).sort((a, b) => b.amount - a.amount);

    const trendMap = new Map<string, number>();
    for (const l of leaks) trendMap.set(l.date, (trendMap.get(l.date) ?? 0) + l.amount);
    const trend = Array.from(trendMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const productMap = new Map<string, { name: string; amount: number; units: number }>();
    for (const l of leaks) {
      if (!l.slug) continue;
      const cur = productMap.get(l.slug) ?? { name: l.label, amount: 0, units: 0 };
      cur.amount += l.amount;
      cur.units += l.units;
      productMap.set(l.slug, cur);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);

    const channelMap = new Map<string, number>();
    for (const l of leaks) channelMap.set(l.channel, (channelMap.get(l.channel) ?? 0) + l.amount);
    const byChannel = Array.from(channelMap.entries())
      .map(([channel, amount]) => ({ channel, amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      range: { start, end },
      summary: {
        totalLost,
        earnedProfit,
        // What the period would have looked like with none of this leaked.
        potentialProfit: earnedProfit + totalLost,
        lostSharePct: earnedProfit + totalLost > 0 ? (totalLost / (earnedProfit + totalLost)) * 100 : 0,
        biggestLeak: buckets[0]?.amount > 0 ? buckets[0].label : null,
      },
      buckets,
      trend,
      topProducts,
      byChannel,
    });
  } catch (err) {
    console.error("admin lost-profit report error:", err);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
