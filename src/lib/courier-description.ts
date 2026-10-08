/** Keep the courier label compact: only SKU and variation, with no duplicate attributes or product names. */
export function courierItemDescription(items: { sku: string; variation: string }[]): string {
  const clean = (value: string) => String(value || "").replace(/\s+/g, " ").trim();
  return items.map(item => {
    const sku = clean(item.sku);
    const rawTokens = clean(item.variation).split("/").map(s => s.trim()).filter(Boolean);
    const uniqueTokens: string[] = [];
    for (const t of rawTokens) {
      if (!uniqueTokens.some((u: string) => u.toLowerCase() === t.toLowerCase()) && (!sku || t.toLowerCase() !== sku.toLowerCase())) {
        uniqueTokens.push(t);
      }
    }
    const varText = uniqueTokens.join(" / ");
    return [sku || "—", varText].filter(Boolean).join(" / ");
  }).join("; ");
}
