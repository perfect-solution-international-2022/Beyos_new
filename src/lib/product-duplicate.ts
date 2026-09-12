/** Copy uploaded image bytes into independent rows, including variant-only images. */
export async function cloneProductImages(
  execute: <T = any>(sql: string, params?: unknown[]) => Promise<T[]>,
  values: string[]
): Promise<Map<string, string>> {
  const replacements = new Map<string, string>();
  for (const url of new Set(values)) {
    const match = url.match(/^\/api\/products\/images\/(\d+)$/);
    if (!match) continue; // Static assets and external URLs are not product-owned records.
    const result = await execute<any>(
      "INSERT INTO product_images (image_data, image_mime) SELECT image_data, image_mime FROM product_images WHERE id = ?",
      [Number(match[1])]
    ) as any;
    if (result.affectedRows !== 1) throw new Error("A source image is missing. Refresh the product before duplicating it.");
    replacements.set(url, `/api/products/images/${result.insertId}`);
  }
  return replacements;
}
