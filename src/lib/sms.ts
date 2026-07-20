import "server-only";

export interface SmsResult {
  sent: boolean;
  skipped?: boolean;
  errorCode?: string;
}

interface OrderSmsDetails {
  phone?: string | null;
  orderRef: string;
  total: number;
  status: string;
}

const DEFAULT_BASE_URL = "https://e-sms.dialog.lk";
const DEFAULT_SOURCE_ADDRESS = "BEYOS";

/** Dialog eSMS expects Sri Lankan mobile numbers without the leading 0 or 94. */
export function normalizeSriLankanPhone(phone?: string | null): string | null {
  if (!phone) return null;

  let normalized = phone.trim().replace(/[\s\-()]/g, "");
  if (normalized.startsWith("+94")) normalized = normalized.slice(3);
  else if (normalized.startsWith("94") && normalized.length === 11) normalized = normalized.slice(2);
  else if (normalized.startsWith("0")) normalized = normalized.slice(1);

  return /^7\d{8}$/.test(normalized) ? normalized : null;
}

function getConfig() {
  const messageKey = process.env.ESMS_URL_MESSAGE_KEY?.trim();
  const baseUrl = (process.env.ESMS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const sourceAddress = (process.env.ESMS_SOURCE_ADDRESS?.trim() || DEFAULT_SOURCE_ADDRESS).slice(0, 11);
  return { messageKey, baseUrl, sourceAddress };
}

function describeProviderError(code: string): string {
  const descriptions: Record<string, string> = {
    "2001": "campaign creation failed",
    "2002": "bad request",
    "2009": "no valid recipient numbers",
    "2012": "sender mask is not permitted",
    "2013": "provider blackout period",
    "2020": "provider rate limit exceeded",
  };
  return descriptions[code] || "provider rejected the message";
}

/**
 * Sends through the same Dialog eSMS URL Message Key endpoint used by the old Beyos.
 * Provider failures are returned (and logged) rather than thrown so an SMS can never
 * roll back or fail an order.
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const recipient = normalizeSriLankanPhone(phone);
  if (!recipient) {
    console.warn("SMS skipped: recipient phone number is invalid");
    return { sent: false, skipped: true, errorCode: "INVALID_PHONE" };
  }

  const { messageKey, baseUrl, sourceAddress } = getConfig();
  if (!messageKey) {
    console.info("SMS skipped: ESMS_URL_MESSAGE_KEY is not configured");
    return { sent: false, skipped: true, errorCode: "NOT_CONFIGURED" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const url = new URL("/api/v1/message-via-url/create/url-campaign", baseUrl);
    url.searchParams.set("esmsqk", messageKey);
    url.searchParams.set("list", recipient);
    url.searchParams.set("source_address", sourceAddress);
    url.searchParams.set("message", message.slice(0, 1600));

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const body = (await response.text()).trim();
    const code = body.split("|", 1)[0]?.trim() || String(response.status);

    if (response.ok && code === "1") return { sent: true };

    console.warn(`Dialog eSMS rejected a message (${code}: ${describeProviderError(code)})`);
    return { sent: false, errorCode: code };
  } catch (error) {
    const code = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
    console.warn(`Dialog eSMS request failed (${code})`);
    return { sent: false, errorCode: code };
  } finally {
    clearTimeout(timeout);
  }
}

function displayStatus(status: string): string {
  return status.replace(/_/g, " ").trim().toUpperCase();
}

export async function sendOrderConfirmationSms(details: OrderSmsDetails): Promise<SmsResult> {
  if (!details.phone?.trim()) return { sent: false, skipped: true, errorCode: "NO_PHONE" };
  const message = `Your Beyos order ${details.orderRef} has been placed successfully. Status: ${displayStatus(details.status)}. Total: LKR ${details.total.toFixed(2)}. Thank you for shopping with us!`;
  return sendSms(details.phone, message);
}

export async function sendOrderStatusSms(
  phone: string | null | undefined,
  orderRef: string,
  status: string
): Promise<SmsResult> {
  if (!phone?.trim()) return { sent: false, skipped: true, errorCode: "NO_PHONE" };
  const message = `Your Beyos order ${orderRef} status has been updated to: ${displayStatus(status)}.`;
  return sendSms(phone, message);
}
