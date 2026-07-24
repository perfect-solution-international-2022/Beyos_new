import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function currentSlugs(userId: number): Promise<string[]> {
  const rows = await query<{ product_slug: string }>(
    "SELECT product_slug FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map((r) => r.product_slug);
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ slugs: [] });
  try {
    return NextResponse.json({ slugs: await currentSlugs(user.id) });
  } catch (err) {
    console.error("wishlist GET error:", err);
    return NextResponse.json({ slugs: [] });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  try {
    await query(
      "INSERT IGNORE INTO wishlist_items (user_id, product_slug) VALUES (?, ?)",
      [user.id, slug]
    );
    return NextResponse.json({ ok: true, slugs: await currentSlugs(user.id) });
  } catch (err) {
    console.error("wishlist POST error:", err);
    return NextResponse.json({ error: "Could not add to wishlist" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  try {
    await query(
      "DELETE FROM wishlist_items WHERE user_id = ? AND product_slug = ?",
      [user.id, slug]
    );
    return NextResponse.json({ ok: true, slugs: await currentSlugs(user.id) });
  } catch (err) {
    console.error("wishlist DELETE error:", err);
    return NextResponse.json({ error: "Could not remove from wishlist" }, { status: 500 });
  }
}
