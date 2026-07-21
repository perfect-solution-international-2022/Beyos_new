import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_FILES = 12;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) return NextResponse.json({ error: "Choose at least one image" }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload no more than ${MAX_FILES} images at once` }, { status: 400 });

    const images: { id: number; url: string }[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: `${file.name} must be JPG, PNG, WebP or GIF` }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: `${file.name} is larger than 6 MB` }, { status: 400 });
      }
      const result = await query<any>(
        "INSERT INTO product_images (image_data, image_mime) VALUES (?, ?)",
        [Buffer.from(await file.arrayBuffer()), file.type]
      );
      const id = Number((result as any).insertId);
      images.push({ id, url: `/api/products/images/${id}` });
    }
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Product image upload failed:", error);
    return NextResponse.json({ error: "Could not upload product images" }, { status: 500 });
  }
}
