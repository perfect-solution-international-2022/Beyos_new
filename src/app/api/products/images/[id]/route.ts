import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  const rows = await query<{ image_data: Buffer; image_mime: string }>(
    "SELECT image_data, image_mime FROM product_images WHERE id = ? LIMIT 1",
    [id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(rows[0].image_data), {
    headers: {
      "Content-Type": rows[0].image_mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
