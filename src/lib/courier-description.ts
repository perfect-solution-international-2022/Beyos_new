/** Keep the courier label compact: only SKU and variation, with no product names. */
export function courierItemDescription(items: { sku: string; variation: string }[]): string {
  const clean = (value: string) => String(value || "").replace(/\s+/g, " ").trim();
  return items.map(item => [clean(item.sku) || "—", clean(item.variation)].filter(Boolean).join(" / ")).join("; ");
}
