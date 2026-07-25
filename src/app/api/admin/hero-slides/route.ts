import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { query } from "@/lib/db";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png")
    return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  return type === "image/webp"
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

async function imageFromForm(form: FormData, required: boolean): Promise<{ bytes: Buffer; type: string } | null> {
  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    if (required) throw new Error("Choose an image to upload");
    return null;
  }
  if (!ALLOWED_TYPES.has(image.type)) throw new Error("Use a JPG, PNG, or WebP image");
  if (image.size > MAX_IMAGE_BYTES) throw new Error("Image must be no larger than 8 MB");
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!validSignature(bytes, image.type)) throw new Error("The uploaded file is not a valid image");
  return { bytes: Buffer.from(bytes), type: image.type };
}

const orderValue = (value: FormDataEntryValue | null) =>
  Math.max(0, Math.min(9999, Math.trunc(Number(value) || 0)));

export async function GET() {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<{
      id: number; alt_text: string | null; sort_order: number; is_active: number; image_version: number;
    }>(
      `SELECT id, alt_text, sort_order, is_active, UNIX_TIMESTAMP(updated_at) AS image_version
       FROM hero_slides ORDER BY sort_order ASC, id ASC`
    );
    return NextResponse.json({
      slides: rows.map((row) => ({
        id: row.id,
        alt: row.alt_text || "",
        order: Number(row.sort_order),
        active: Boolean(row.is_active),
        image: `/api/hero-slides/${row.id}/image?v=${row.image_version || 0}`,
      })),
    });
  } catch (error) {
    console.error("hero slides GET error:", error);
    return NextResponse.json({ error: "Could not load hero slides" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const form = await request.formData();
    const image = await imageFromForm(form, true);
    const alt = String(form.get("alt") || "").trim().slice(0, 200);
    const result = await query<any>(
      `INSERT INTO hero_slides (image_data, image_mime, alt_text, sort_order, is_active)
       VALUES (?,?,?,?,?)`,
      [image!.bytes, image!.type, alt || null, orderValue(form.get("order")), form.get("active") === "true" ? 1 : 0]
    );
    revalidatePath("/");
    return NextResponse.json({ ok: true, id: Number((result as any).insertId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add hero slide";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid hero slide");
    const image = await imageFromForm(form, false);
    const alt = String(form.get("alt") || "").trim().slice(0, 200);
    const fields = ["alt_text = ?", "sort_order = ?", "is_active = ?"];
    const values: unknown[] = [alt || null, orderValue(form.get("order")), form.get("active") === "true" ? 1 : 0];
    if (image) {
      fields.push("image_data = ?", "image_mime = ?");
      values.push(image.bytes, image.type);
    }
    values.push(id);
    await query(`UPDATE hero_slides SET ${fields.join(", ")} WHERE id = ?`, values);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update hero slide";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { id?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "Invalid hero slide" }, { status: 400 });
  await query("DELETE FROM hero_slides WHERE id = ?", [id]);
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
