import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { getMaintenanceMode, setMaintenanceMode } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(
    { maintenance: await getMaintenanceMode() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function PUT(request: Request) {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { maintenance?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.maintenance !== "boolean") {
    return NextResponse.json({ error: "Maintenance status must be true or false" }, { status: 400 });
  }

  await setMaintenanceMode(body.maintenance);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, maintenance: body.maintenance });
}

export async function POST() {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, clearedAt: new Date().toISOString() });
}
