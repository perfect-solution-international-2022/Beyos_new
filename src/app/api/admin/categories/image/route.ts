import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png")
    return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp")
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const form = await request.formData();
    const categoryId = Number(form.get("categoryId"));
    const image = form.get("image");
    if (!Number.isInteger(categoryId) || categoryId <= 0)
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    if (!(image instanceof Blob))
      return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
    if (!ALLOWED_TYPES.has(image.type))
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 });
    if (image.size <= 0 || image.size > MAX_IMAGE_BYTES)
      return NextResponse.json({ error: "Image must be no larger than 5 MB" }, { status: 400 });

    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!hasValidSignature(bytes, image.type))
      return NextResponse.json({ error: "The uploaded file is not a valid image" }, { status: 400 });

    const exists = await query("SELECT id FROM categories WHERE id = ?", [categoryId]);
    if (!exists.length) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    await query(
      "UPDATE categories SET image_data = ?, image_mime = ? WHERE id = ?",
      [Buffer.from(bytes), image.type, categoryId]
    );
    revalidatePath("/");
    revalidatePath("/shop");
    return NextResponse.json({
      ok: true,
      imageUrl: `/api/categories/${categoryId}/image?v=${Date.now()}`,
    });
  } catch (error) {
    console.error("category image upload error:", error);
    return NextResponse.json({ error: "Could not upload image" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { categoryId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const categoryId = Number(body.categoryId);
  if (!Number.isInteger(categoryId) || categoryId <= 0)
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  await query("UPDATE categories SET image_data = NULL, image_mime = NULL WHERE id = ?", [categoryId]);
  revalidatePath("/");
  revalidatePath("/shop");
  return NextResponse.json({ ok: true });
}
