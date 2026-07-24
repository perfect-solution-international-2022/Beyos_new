const DEFAULT_BASE_URL = "https://application.koombiyodelivery.lk/api/";

type JsonObject = Record<string, unknown>;

function config() {
  const apiKey = process.env.KOOMBIYO_API_KEY?.trim();
  if (!apiKey) throw new Error("Koombiyo is not configured");

  const rawBase = process.env.KOOMBIYO_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return {
    apiKey,
    baseUrl: rawBase.endsWith("/") ? rawBase : `${rawBase}/`,
  };
}

async function postForm(path: string, fields: Record<string, string | number>) {
  const { apiKey, baseUrl } = config();
  const body = new URLSearchParams({ apikey: apiKey });
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value));

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Some Koombiyo endpoints can return a plain-text success/error message.
  }

  if (!response.ok) {
    throw new Error(`Koombiyo request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return data;
}

export interface KoombiyoDistrict { id: number; name: string }
export interface KoombiyoCity { id: number; name: string }

export async function getDistricts(): Promise<KoombiyoDistrict[]> {
  const raw = await postForm("Districts/users", {});
  const list = Array.isArray(raw) ? raw : [];
  const parsed = list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as JsonObject;
    const id = Number(row.district_id);
    const name = String(row.district_name || "").trim();
    return id && name ? [{ id, name }] : [];
  });
  return [...new Map(parsed.map((item) => [item.name.toLowerCase(), item])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCities(districtId: number): Promise<KoombiyoCity[]> {
  const raw = await postForm("Cities/users", { district_id: districtId });
  const list = Array.isArray(raw) ? raw : [];
  const parsed = list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as JsonObject;
    const id = Number(row.city_id);
    const name = String(row.city_name || "").trim();
    return id && name && name.length <= 100 ? [{ id, name }] : [];
  });
  return [...new Map(parsed.map((item) => [item.name.toLowerCase(), item])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
}

function findWaybill(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findWaybill(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    const object = value as JsonObject;
    for (const key of ["waybill_id", "waybillid", "wayBillId", "waybill"]) {
      const candidate = object[key];
      if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
    }
    for (const nested of Object.values(object)) {
      const found = findWaybill(nested);
      if (found) return found;
    }
  }
  return null;
}

export async function requestWaybill(): Promise<string> {
  const response = await postForm("Waybils/users", { limit: 1 });
  const waybill = findWaybill(response);
  if (!waybill) throw new Error("Koombiyo did not return a waybill ID");
  return waybill;
}

export interface KoombiyoOrderInput {
  waybillId: string;
  orderRef: string;
  receiverName: string;
  receiverStreet: string;
  receiverPhone: string;
  codAmount: number;
  description?: string;
  specialNote?: string;
  districtId?: number;
  cityId?: number;
}

export async function submitOrder(input: KoombiyoOrderInput) {
  return postForm("Addorders/users", {
    orderWaybillid: input.waybillId,
    orderNo: input.orderRef,
    receiverName: input.receiverName,
    receiverStreet: input.receiverStreet,
    receiverDistrict: input.districtId ?? Number(process.env.KOOMBIYO_DEFAULT_DISTRICT_ID || 1),
    receiverCity: input.cityId ?? Number(process.env.KOOMBIYO_DEFAULT_CITY_ID || 1),
    receiverPhone: input.receiverPhone,
    description: input.description || `Beyos order ${input.orderRef}`,
    spclNote: input.specialNote || "",
    getCod: Math.max(0, Math.round(input.codAmount)),
  });
}

export interface KoombiyoTracking {
  status: string;
  waybillId: string;
  details: JsonObject;
  raw: unknown;
}

export async function trackOrder(waybillId: string): Promise<KoombiyoTracking> {
  const raw = await postForm("Allorders/users", { waybillid: waybillId, offset: 0, limit: 1 });
  const object = raw && typeof raw === "object" ? (raw as JsonObject) : {};
  const orders = Array.isArray(object.cust_orders) ? object.cust_orders : [];
  const details = (orders[0] && typeof orders[0] === "object" ? orders[0] : object) as JsonObject;
  const status = String(details.orderstatus || details.delivery_status || details.status || "Unknown");
  return { status, waybillId: findWaybill(details) || waybillId, details, raw };
}

export function mapKoombiyoStatus(status: string): string {
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["DELIVERED", "CLIENT_RECEIVED"].includes(normalized)) return "delivered";
  if (["FAILED", "FAILED_TO_DELIVER", "CANCELLED"].includes(normalized)) return "cancelled";
  if (
    [
      "PICKED", "PICK", "INTRANSIT", "IN_TRANSIT", "COLLECTED_BY_KOOMBIYO",
      "DISPATCH_TO_DESTINATION", "RECEIVED_AT_DESTINATION", "OUT_FOR_DELIVERY",
      "RESCHEDULED", "DELIVERED_NOT_CONFIRMED", "PARTIALLY_DELIVERED",
    ].includes(normalized)
  ) return "shipped";
  if (["PENDING", "CONFIRMED", "CONFIRMED_BY_BRANCH", "BOOKED"].includes(normalized)) return "confirmed";
  return "processing";
}

export function trackingUrl(waybillId: string, phone: string) {
  const params = new URLSearchParams({ id: waybillId, phone });
  return `https://koombiyodelivery.lk/Track/track_id?${params}`;
}
