import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface Line {
  productSlug: string;
  name: string;
  variantKey: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  date: string;
  time: string;
}

function parseWindow(searchParams: URLSearchParams) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const startTime = searchParams.get("startTime") || "00:00";
  const endTime = searchParams.get("endTime") || "23:59";
  const start = `${startDate} ${startTime}:00`;
  const end = `${endDate} ${endTime}:59`;
  return { startDate, endDate, startTime, endTime, start, end };
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { startDate, endDate, startTime, endTime, start, end } = parseWindow(searchParams);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const typeFilter = (searchParams.get("type") || "").trim().toLowerCase();
  const categoryFilter = (searchParams.get("category") || "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));

  try {
    // ---- Buyer order line items in window ----
    const buyerLines = await query<any>(
      `SELECT oi.product_slug, oi.name, oi.size, oi.color, oi.quantity, oi.unit_price, oi.line_total,
              DATE(o.created_at) AS d, TIME(o.created_at) AS t
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.created_at BETWEEN ? AND ?`,
      [start, end]
    );

    // ---- Reseller order line items in window (excludes rejected) ----
    const resellerLines = await query<any>(
      `SELECT roi.product_slug, roi.name, roi.sku, roi.variant_summary, roi.quantity, roi.selling_price AS unit_price, roi.line_total,
              DATE(ro.created_at) AS d, TIME(ro.created_at) AS t
       FROM reseller_order_items roi
       JOIN reseller_orders ro ON ro.id = roi.order_id
       WHERE ro.created_at BETWEEN ? AND ? AND ro.status <> 'rejected'`,
      [start, end]
    );

    // ---- POS sale line items in window ----
    const posLines = await query<any>(
      `SELECT psi.product_slug, psi.name, psi.sku, psi.size, psi.color, psi.quantity, psi.unit_price, psi.line_total,
              DATE(s.created_at) AS d, TIME(s.created_at) AS t
       FROM pos_sale_items psi
       JOIN pos_sales s ON s.id = psi.sale_id
       WHERE s.created_at BETWEEN ? AND ? AND s.status = 'completed'`,
      [start, end]
    );

    const lines: Line[] = [
      ...buyerLines.map((r: any) => ({
        productSlug: r.product_slug, name: r.name, sku: "", size: r.size || "", color: r.color || "",
        variantKey: [r.size, r.color].filter(Boolean).join(" / "),
        quantity: r.quantity, unitPrice: Number(r.unit_price), lineTotal: Number(r.line_total),
        date: r.d, time: r.t,
      })),
      ...resellerLines.map((r: any) => ({
        productSlug: r.product_slug, name: r.name, sku: r.sku || "", size: "", color: "",
        variantKey: r.variant_summary || r.sku || "",
        quantity: r.quantity, unitPrice: Number(r.unit_price), lineTotal: Number(r.line_total),
        date: r.d, time: r.t,
      })),
      ...posLines.map((r: any) => ({
        // Note: pos_sale_items.sku is always the base product's SKU (not variant-specific — the
        // register only records size/color per line), so size/color must take priority here.
        productSlug: r.product_slug, name: r.name, sku: r.sku || "", size: r.size || "", color: r.color || "",
        variantKey: [r.size, r.color].filter(Boolean).join(" / ") || r.sku || "",
        quantity: r.quantity, unitPrice: Number(r.unit_price), lineTotal: Number(r.line_total),
        date: r.d, time: r.t,
      })),
    ];

    // ---- Order/receipt counts + revenue totals (order-level, incl. shipping/discount/tax) ----
    const buyerOrders = await query<{ id: number; total: string }>(
      `SELECT id, total FROM orders WHERE created_at BETWEEN ? AND ?`,
      [start, end]
    );
    const resellerOrders = await query<{ id: number; amount: string }>(
      `SELECT id, amount FROM reseller_orders WHERE created_at BETWEEN ? AND ? AND status <> 'rejected'`,
      [start, end]
    );
    const posSales = await query<{ id: number; total: string }>(
      `SELECT id, total FROM pos_sales WHERE created_at BETWEEN ? AND ? AND status = 'completed'`,
      [start, end]
    );

    const totalRevenue =
      buyerOrders.reduce((s, o) => s + Number(o.total), 0) +
      resellerOrders.reduce((s, o) => s + Number(o.amount), 0) +
      posSales.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = buyerOrders.length + resellerOrders.length + posSales.length;
    const itemsSold = lines.reduce((s, l) => s + l.quantity, 0);
    const itemValue = lines.reduce((s, l) => s + l.lineTotal, 0);

    // ---- Daily chart (merged across all 3 sources) ----
    const chartMap = new Map<string, { revenue: number; itemsSold: number }>();
    for (const l of lines) {
      const cur = chartMap.get(l.date) ?? { revenue: 0, itemsSold: 0 };
      cur.revenue += l.lineTotal;
      cur.itemsSold += l.quantity;
      chartMap.set(l.date, cur);
    }
    const chart = Array.from(chartMap.entries())
      .map(([date, v]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        revenue: v.revenue,
        itemsSold: v.itemsSold,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ---- Product-level lookup (image, category, type) ----
    const slugs = Array.from(new Set(lines.map((l) => l.productSlug)));
    const products = slugs.length
      ? await query<any>(
          `SELECT id, slug, name, image, category, product_type FROM products WHERE slug IN (${slugs.map(() => "?").join(",")})`,
          slugs
        )
      : [];
    const productBySlug = new Map(products.map((p) => [p.slug, p]));

    // ---- Aggregate per product ----
    const byProduct = new Map<
      string,
      { name: string; unitsSold: number; totalRevenue: number; minPrice: number; maxPrice: number; date: string; time: string; variants: Map<string, { key: string; sku: string; size: string; color: string; sold: number; revenue: number; minPrice: number; maxPrice: number }> }
    >();
    for (const l of lines) {
      let agg = byProduct.get(l.productSlug);
      if (!agg) {
        agg = { name: l.name, unitsSold: 0, totalRevenue: 0, minPrice: l.unitPrice, maxPrice: l.unitPrice, date: l.date, time: l.time, variants: new Map() };
        byProduct.set(l.productSlug, agg);
      }
      agg.unitsSold += l.quantity;
      agg.totalRevenue += l.lineTotal;
      agg.minPrice = Math.min(agg.minPrice, l.unitPrice);
      agg.maxPrice = Math.max(agg.maxPrice, l.unitPrice);
      if (`${l.date}T${l.time}` > `${agg.date}T${agg.time}`) { agg.date = l.date; agg.time = l.time; }

      const vKey = l.variantKey || "Standard";
      let v = agg.variants.get(vKey);
      if (!v) {
        v = { key: vKey, sku: l.sku, size: l.size, color: l.color, sold: 0, revenue: 0, minPrice: l.unitPrice, maxPrice: l.unitPrice };
        agg.variants.set(vKey, v);
      }
      v.sold += l.quantity;
      v.revenue += l.lineTotal;
      v.minPrice = Math.min(v.minPrice, l.unitPrice);
      v.maxPrice = Math.max(v.maxPrice, l.unitPrice);
      if (!v.sku && l.sku) v.sku = l.sku;
    }

    // ---- Current stock per variant, best-effort match by sku then by attribute_summary ----
    const productIds = products.map((p) => p.id);
    const variantRows = productIds.length
      ? await query<any>(
          `SELECT product_id, sku, attribute_summary, stock FROM product_variants WHERE product_id IN (${productIds.map(() => "?").join(",")})`,
          productIds
        )
      : [];

    const formatPrice = (min: number, max: number) => (min === max ? min : `${min}-${max}`);

    let rows = Array.from(byProduct.entries()).map(([slug, agg]) => {
      const product = productBySlug.get(slug);
      const type = product?.product_type ?? "simple";
      const productVariantRows = variantRows.filter((v) => v.product_id === product?.id);

      const variantBreakdown =
        type === "variable"
          ? Array.from(agg.variants.values())
              .sort((a, b) => b.sold - a.sold)
              .map((v) => {
                const match =
                  (v.sku && productVariantRows.find((pv) => pv.sku === v.sku)) ||
                  productVariantRows.find((pv) => pv.attribute_summary === v.key);
                return {
                  // Prefer the matched product_variants row's real SKU — the line-recorded sku
                  // (v.sku) may just be the base product's SKU for POS-sourced lines.
                  sku: match?.sku || v.sku || "",
                  size: v.size,
                  color: v.color,
                  label: v.key,
                  unitPrice: formatPrice(v.minPrice, v.maxPrice),
                  stock: match ? Number(match.stock) : null,
                  sold: v.sold,
                  totalRevenue: v.revenue,
                };
              })
          : [];

      return {
        slug,
        productName: product?.name ?? agg.name,
        image: product?.image ?? null,
        category: product?.category ?? null,
        type,
        unitPrice: formatPrice(agg.minPrice, agg.maxPrice),
        unitsSold: agg.unitsSold,
        totalRevenue: agg.totalRevenue,
        date: agg.date,
        time: agg.time,
        variantBreakdown,
      };
    });

    if (search) rows = rows.filter((r) => r.productName.toLowerCase().includes(search));
    if (typeFilter) rows = rows.filter((r) => r.type === typeFilter);
    if (categoryFilter) rows = rows.filter((r) => (r.category ?? "").toLowerCase() === categoryFilter);

    rows.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pageRows = rows.slice((page - 1) * limit, (page - 1) * limit + limit);

    return NextResponse.json({
      range: { startDate, endDate, startTime, endTime },
      summary: { totalRevenue, itemsSold, totalOrders, itemValue },
      chart,
      salesDetails: pageRows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("admin item report error:", err);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
