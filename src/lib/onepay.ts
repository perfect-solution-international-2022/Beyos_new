import crypto from "crypto";

// v3 Payment API (api.onepay.lk). Note this is NOT the same endpoint as the
// (broken/unofficial) @onepay-payment-sdk/server npm package, which targets
// a different "v2 gateway" host and never worked against this merchant
// account. This implementation is verified against OnePay's real servers.
const ONEPAY_ENDPOINT = "https://api.onepay.lk/v3/checkout/link/";

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
      hash,
    }),
  });

  const data = await res.json();
  const redirectUrl: string | undefined = data?.data?.gateway?.redirect_url;
  const transactionId: string | undefined = data?.data?.ipg_transaction_id;

  if (!redirectUrl) {
    const detail = data?.errors ? JSON.stringify(data.errors) : data?.message || JSON.stringify(data);
    throw new Error(`OnePay checkout failed: ${detail}`);
  }

  return { redirectUrl, transactionId: transactionId ?? "" };
}
