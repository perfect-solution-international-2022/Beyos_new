import crypto from "crypto";

// v3 Payment API (api.onepay.lk). Note this is NOT the same endpoint as the
// (broken/unofficial) @onepay-payment-sdk/server npm package, which targets
// a different "v2 gateway" host and never worked against this merchant
// account. This implementation is verified against OnePay's real servers.
const ONEPAY_ENDPOINT = "https://api.onepay.lk/v3/checkout/link/";
const ONEPAY_CHECKOUT_HOSTS = new Set(["payment.onepay.lk"]);

export interface OnepayCheckoutParams {
  amount: number;
  currency?: "LKR" | "USD";
  reference: string; // must be <= 20 chars
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  transactionRedirectUrl: string;
}

export interface OnepayCheckoutResult {
  redirectUrl: string;
  transactionId: string;
}

export interface OnepayVerifiedTransaction {
  transactionId: string;
  paid: boolean;
  amount: number;
  currency: string;
  paidOn: string | null;
}

function getCredentials() {
  const appId = process.env.ONEPAY_APP_ID?.trim();
  const hashSalt = process.env.ONEPAY_HASH_SALT?.trim();
  const appToken = process.env.ONEPAY_APP_TOKEN?.trim();
  if (!appId || !hashSalt || !appToken) {
    throw new Error(
      "OnePay is not configured. Set ONEPAY_APP_ID, ONEPAY_APP_TOKEN and ONEPAY_HASH_SALT in .env.local."
    );
  }
  return { appId, hashSalt, appToken };
}

function validatedOnepayRedirectUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("OnePay did not return a checkout URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("OnePay returned an invalid checkout URL");
  }
  if (
    url.protocol !== "https:" ||
    !ONEPAY_CHECKOUT_HOSTS.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("OnePay returned an untrusted checkout URL");
  }
  return url.toString();
}

/**
 * Creates a hosted OnePay checkout link. The signature hash is
 * SHA256(app_id + currency + amount.toFixed(2) + hash_salt) — the amount
 * MUST be formatted to exactly 2 decimal places in the hash string, and the
 * Authorization header is the raw app token (no "Bearer" prefix).
 */
export async function createOnepayCheckout(
  params: OnepayCheckoutParams
): Promise<OnepayCheckoutResult> {
  const { appId, hashSalt, appToken } = getCredentials();
  const currency = params.currency ?? "LKR";
  const amountHashString = params.amount.toFixed(2);

  const hash = crypto
    .createHash("sha256")
    .update(`${appId}${currency}${amountHashString}${hashSalt}`)
    .digest("hex");

  const res = await fetch(ONEPAY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: appToken,
    },
    body: JSON.stringify({
      app_id: appId,
      reference: params.reference.slice(0, 20),
      currency,
      amount: params.amount,
      customer_first_name: params.firstName,
      customer_last_name: params.lastName,
      customer_phone_number: params.phone,
      customer_email: params.email,
      transaction_redirect_url: params.transactionRedirectUrl,
      additionalData: params.reference,
      hash,
    }),
  });

  const data = await res.json();
  const rawRedirectUrl: unknown = data?.data?.gateway?.redirect_url;
  const transactionId: string | undefined = data?.data?.ipg_transaction_id;

  if (!rawRedirectUrl) {
    // Do not propagate the provider response body: callers may log the Error.
    throw new Error(`OnePay checkout failed (${res.status})`);
  }

  const redirectUrl = validatedOnepayRedirectUrl(rawRedirectUrl);
  if (!transactionId || !/^[A-Za-z0-9_-]{8,100}$/.test(transactionId)) {
    throw new Error("OnePay returned an invalid transaction ID");
  }

  return { redirectUrl, transactionId };
}

/** Queries OnePay directly. Callback/redirect values are never treated as proof of payment. */
export async function verifyOnepayTransaction(transactionId: string): Promise<OnepayVerifiedTransaction> {
  const { appId, appToken } = getCredentials();
  const id = transactionId.trim();
  if (!id) throw new Error("OnePay transaction ID is required");

  const res = await fetch("https://api.onepay.lk/v3/transaction/status/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: appToken,
    },
    body: JSON.stringify({ app_id: appId, onepay_transaction_id: id }),
    cache: "no-store",
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) throw new Error(`OnePay status verification failed (${res.status})`);
  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  const verifiedId = String(data.ipg_transaction_id || data.onepay_transaction_id || "").trim();
  if (!verifiedId || verifiedId !== id) throw new Error("OnePay returned a mismatched transaction ID");

  return {
    transactionId: verifiedId,
    paid: data.status === true || data.status === 1 || data.status === "1" || String(data.status).toUpperCase() === "SUCCESS",
    amount: Number(data.amount),
    currency: String(data.currency || "").toUpperCase(),
    paidOn: data.paid_on ? String(data.paid_on) : null,
  };
}
