import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";
import { estimateUnitCost } from "@/lib/report-costs";

function parseRange(searchParams: URLSearchParams) {
  const end = searchParams.get("end") || new Date().toISOString().slice(0, 10);
  const startDefault = new Date();
  startDefault.setDate(startDefault.getDate() - 29);
  const start = searchParams.get("start") || startDefault.toISOString().slice(0, 10);
  return { start, end };
}

export async function GET(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ error: "Product slug required" }, { status: 400 });

  const { start, end } = parseRange(searchParams);

  try {
    // 1. Fetch Product details
    const productRows = await query<any>(
      `SELECT id, slug, name, price, sale_price, wholesale_price, production_cost, image
       FROM products WHERE slug = ? AND deleted_at IS NULL LIMIT 1`,
      [slug]
    );
    if (!productRows.length) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const product = productRows[0];

    // 2. Fetch Customer Order Items (website)
    const websiteItems = await query<any>(
      `SELECT oi.id, o.order_ref AS reference, o.customer_name, oi.name, oi.size, oi.color,
              oi.quantity, oi.unit_price, oi.line_total,
              COALESCE(v.production_cost, p.production_cost) AS production_cost,
              COALESCE(v.price, p.price) AS list_price,
              COALESCE(v.sale_price, p.sale_price) AS sale_price,
              COALESCE(v.wholesale_price, p.wholesale_price) AS wholesale_price,
              v.sku AS variant_sku, v.attribute_summary,
              DATE(o.created_at) AS order_date, TIME(o.created_at) AS order_time,
              'website' AS channel
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.slug = oi.product_slug
       LEFT JOIN product_variants v ON v.id = oi.variant_id
       WHERE oi.product_slug = ? AND o.deleted_at IS NULL AND o.status = 'delivered'
         AND DATE(o.created_at) BETWEEN ? AND ?`,
      [slug, start, end]
    );

    // 3. Fetch POS Sale Items
    const posItems = await query<any>(
      `SELECT psi.id, s.receipt_number AS reference, s.customer_name, psi.name, psi.size, psi.color,
              psi.quantity, psi.unit_price, psi.line_total,
              COALESCE(v.production_cost, p.production_cost) AS production_cost,
              COALESCE(v.price, p.price) AS list_price,
              COALESCE(v.sale_price, p.sale_price) AS sale_price,
              COALESCE(v.wholesale_price, p.wholesale_price) AS wholesale_price,
              v.sku AS variant_sku, v.attribute_summary,
              DATE(s.created_at) AS order_date, TIME(s.created_at) AS order_time,
              'pos' AS channel
       FROM pos_sale_items psi
       JOIN pos_sales s ON s.id = psi.sale_id
       LEFT JOIN products p ON p.slug = psi.product_slug
       LEFT JOIN product_variants v ON v.id = psi.variant_id
       WHERE psi.product_slug = ? AND s.deleted_at IS NULL AND s.status = 'completed'
         AND (COALESCE(s.fulfillment_type, 'pickup') <> 'delivery' OR s.delivery_status = 'delivered')
         AND DATE(s.created_at) BETWEEN ? AND ?`,
      [slug, start, end]
    );

    // 4. Fetch Reseller Order Items
    const resellerItems = await query<any>(
      `SELECT roi.id, ro.order_ref AS reference, ro.customer_name, roi.name, '' AS size, '' AS color,
              roi.quantity, roi.selling_price AS unit_price, roi.line_total,
              roi.reseller_price AS production_cost,
              COALESCE(v.price, p.price) AS list_price,
              COALESCE(v.sale_price, p.sale_price) AS sale_price,
              COALESCE(v.wholesale_price, p.wholesale_price) AS wholesale_price,
              v.sku AS variant_sku, roi.variant_summary AS attribute_summary,
              DATE(ro.created_at) AS order_date, TIME(ro.created_at) AS order_time,
              'reseller' AS channel
       FROM reseller_order_items roi
       JOIN reseller_orders ro ON ro.id = roi.order_id
       LEFT JOIN products p ON p.slug = roi.product_slug
       LEFT JOIN product_variants v ON v.id = roi.variant_id
       WHERE roi.product_slug = ? AND ro.deleted_at IS NULL AND ro.status = 'delivered'
         AND DATE(ro.created_at) BETWEEN ? AND ?`,
      [slug, start, end]
    );

    const allRawItems = [...websiteItems, ...posItems, ...resellerItems];

    type PriceCategory = "regular" | "sale" | "wholesale" | "reseller";

    interface ProcessedLine {
      id: number;
      reference: string;
      customerName: string;
      channel: "website" | "pos" | "reseller";
      date: string;
      time: string;
      variant: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      unitCost: number;
      lineCost: number;
      lineProfit: number;
      priceType: PriceCategory;
      priceTypeLabel: string;
      concession: number;
      isCostEstimated: boolean;
    }

    const processedLines: ProcessedLine[] = allRawItems.map((r) => {
      const quantity = Number(r.quantity || 1);
      const unitPrice = Number(r.unit_price || 0);
      const lineTotal = Number(r.line_total || (quantity * unitPrice));
      const listPrice = Number(r.list_price || product.price || 0);
      const salePrice = Number(r.sale_price || product.sale_price || 0);
      const wholesalePrice = Number(r.wholesale_price || product.wholesale_price || 0);

      let unitCost = 0;
      let isCostEstimated = false;
      if (r.channel === "reseller") {
        unitCost = Number(r.production_cost || 0);
      } else if (r.production_cost != null && r.production_cost !== "" && Number(r.production_cost) > 0) {
        unitCost = Number(r.production_cost);
      } else {
        unitCost = estimateUnitCost(unitPrice, null);
        isCostEstimated = true;
      }

      const lineCost = unitCost * quantity;
      const lineProfit = lineTotal - lineCost;

      let priceType: PriceCategory = "regular";
      let priceTypeLabel = "Regular Price";

      if (r.channel === "reseller") {
        priceType = "reseller";
        priceTypeLabel = "Reseller Price";
      } else if (wholesalePrice > 0 && (Math.abs(unitPrice - wholesalePrice) <= 1 || unitPrice <= wholesalePrice)) {
        priceType = "wholesale";
        priceTypeLabel = "Wholesale Price";
      } else if (salePrice > 0 && Math.abs(unitPrice - salePrice) <= 1) {
        priceType = "sale";
        priceTypeLabel = "Selling / Sale Price";
      } else if (listPrice > 0 && unitPrice < listPrice) {
        priceType = "sale";
        priceTypeLabel = "Selling / Sale Price";
      } else {
        priceType = "regular";
        priceTypeLabel = "Regular Price";
      }

      const concession = Math.max(0, (listPrice - unitPrice) * quantity);
      const variant = r.attribute_summary || [r.size, r.color].filter(Boolean).join(" / ") || "Standard";

      return {
        id: r.id,
        reference: r.reference,
        customerName: r.customer_name || (r.channel === "pos" ? "Walk-in Customer" : "Customer"),
        channel: r.channel,
        date: r.order_date,
        time: r.order_time || "",
        variant,
        quantity,
        unitPrice,
        lineTotal,
        unitCost,
        lineCost,
        lineProfit,
        priceType,
        priceTypeLabel,
        concession,
        isCostEstimated,
      };
    });

    const totalUnits = processedLines.reduce((s, l) => s + l.quantity, 0);
    const totalRevenue = processedLines.reduce((s, l) => s + l.lineTotal, 0);
    const totalCost = processedLines.reduce((s, l) => s + l.lineCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalConcession = processedLines.reduce((s, l) => s + l.concession, 0);

    const createTierGroup = () => ({ units: 0, revenue: 0, cost: 0, profit: 0, marginPct: 0, concession: 0 });
    const byPriceType: Record<PriceCategory, ReturnType<typeof createTierGroup>> = {
      regular: createTierGroup(),
      sale: createTierGroup(),
      wholesale: createTierGroup(),
      reseller: createTierGroup(),
    };

    for (const l of processedLines) {
      const g = byPriceType[l.priceType];
      g.units += l.quantity;
      g.revenue += l.lineTotal;
      g.cost += l.lineCost;
      g.profit += l.lineProfit;
      g.concession += l.concession;
    }
    for (const key of Object.keys(byPriceType) as PriceCategory[]) {
      const g = byPriceType[key];
      g.marginPct = g.revenue > 0 ? (g.profit / g.revenue) * 100 : 0;
    }

    const createChannelGroup = () => ({ units: 0, revenue: 0, cost: 0, profit: 0, marginPct: 0 });
    const byChannel = {
      pos: createChannelGroup(),
      website: createChannelGroup(),
      reseller: createChannelGroup(),
    };
    for (const l of processedLines) {
      const g = byChannel[l.channel];
      g.units += l.quantity;
      g.revenue += l.lineTotal;
      g.cost += l.lineCost;
      g.profit += l.lineProfit;
    }
    for (const ch of ["pos", "website", "reseller"] as const) {
      const g = byChannel[ch];
      g.marginPct = g.revenue > 0 ? (g.profit / g.revenue) * 100 : 0;
    }

    const variantMap = new Map<string, { variant: string; units: number; revenue: number; cost: number; profit: number }>();
    for (const l of processedLines) {
      const cur = variantMap.get(l.variant) ?? { variant: l.variant, units: 0, revenue: 0, cost: 0, profit: 0 };
      cur.units += l.quantity;
      cur.revenue += l.lineTotal;
      cur.cost += l.lineCost;
      cur.profit += l.lineProfit;
      variantMap.set(l.variant, cur);
    }
    const variants = Array.from(variantMap.values())
      .map((v) => ({ ...v, marginPct: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0 }))
      .sort((a, b) => b.units - a.units);

    const recentOrders = [...processedLines]
      .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")))
      .slice(0, 100);

    return NextResponse.json({
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        regularPrice: Number(product.price || 0),
        salePrice: product.sale_price ? Number(product.sale_price) : null,
        wholesalePrice: product.wholesale_price ? Number(product.wholesale_price) : null,
        productionCost: product.production_cost ? Number(product.production_cost) : null,
        hasConfiguredCost: product.production_cost != null && product.production_cost !== "" && Number(product.production_cost) > 0,
      },
      range: { start, end },
      summary: {
        totalUnits,
        totalRevenue,
        totalCost,
        totalProfit,
        marginPct,
        totalConcession,
      },
      byPriceType,
      byChannel,
      variants,
      recentOrders,
    });
  } catch (err) {
    console.error("admin product profit breakdown error:", err);
    return NextResponse.json({ error: "Could not load product details" }, { status: 500 });
  }
}
