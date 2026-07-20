import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const rows = await query<{ image_data: Buffer | null; image_mime: string | null }>(
    "SELECT image_data, image_mime FROM categories WHERE id = ? LIMIT 1",
    [id]
  );
  const image = rows[0];
  if (!image?.image_data || !image.image_mime)
    return NextResponse.json({ error: "Image not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(image.image_data), {
    headers: {
      "Content-Type": image.image_mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
