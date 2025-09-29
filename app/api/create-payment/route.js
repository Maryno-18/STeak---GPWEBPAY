import crypto from "crypto";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderNumber, amount, email } = body;

    const MERCHANTNUMBER = process.env.GP_MERCHANT_NUMBER;
    const CURRENCY = "203";
    const DEPOSITFLAG = "1";
    const OPERATION = "CREATE_ORDER";
    const RETURN_URL = process.env.GP_RETURN_URL || "https://your-domain.cz/api/payment-callback";
    const AMOUNT = amount * 100;

    const privateKeyPath = path.join(process.cwd(), "keys", "gpwebpay-pvk.key");
    const privateKey = {
      key: fs.readFileSync(privateKeyPath, "utf8"),
      passphrase: process.env.GP_PRIVATE_KEY_PASSPHRASE,
    };

    const params = {
      MERCHANTNUMBER,
      OPERATION,
      ORDERNUMBER: orderNumber,
      AMOUNT,
      CURRENCY,
      DEPOSITFLAG,
      URL: RETURN_URL,
      EMAIL: email,
    };

    const digestText = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("|");

    const sign = crypto.createSign("sha1");
    sign.update(digestText, "utf8");
    const digest = sign.sign(privateKey, "base64");

    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const gpUrl = "https://test.3dsecure.gpwebpay.com/pgw/order.do";
    const redirectUrl = `${gpUrl}?${query}&DIGEST=${encodeURIComponent(digest)}`;

    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Signing error:", error);
    return new Response(JSON.stringify({ error: "Failed to sign request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

