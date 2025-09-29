import crypto from "crypto";
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { orderNumber, amount, email } = req.body;

  // Merchant údaje
  const MERCHANTNUMBER = process.env.GP_MERCHANT_NUMBER;
  const CURRENCY = "203"; // CZK
  const DEPOSITFLAG = "1";
  const OPERATION = "CREATE_ORDER";
  const RETURN_URL = process.env.GP_RETURN_URL || "https://your-domain.cz/api/payment-callback";

  // Částka v haléřích
  const AMOUNT = amount * 100;

  // Načtení privátního klíče PEM
  const privateKeyPath = path.join(process.cwd(), "keys", "gpwebpay-pvk.key");
  const privateKey = {
    key: fs.readFileSync(privateKeyPath, "utf8"),
    passphrase: process.env.GP_PRIVATE_KEY_PASSPHRASE,
  };

  // Pole v přesném pořadí pro podpis
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

  // Text pro podpis (oddělený |)
  const digestText = Object.entries(params)
    .map(([key, val]) => `${key}=${val}`)
    .join("|");

  try {
    // Vytvoření podpisu SHA1withRSA
    const sign = crypto.createSign("sha1");
    sign.update(digestText, "utf8");
    const digest = sign.sign(privateKey, "base64");

    // Query string (URL-encoded hodnoty)
    const query = Object.entries(params)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join("&");

    const gpUrl = "https://test.3dsecure.gpwebpay.com/pgw/order.do";
    const redirectUrl = `${gpUrl}?${query}&DIGEST=${encodeURIComponent(digest)}`;

    return res.status(200).json({ redirectUrl });
  } catch (error) {
    console.error("Signing error:", error);
    return res.status(500).json({ error: "Failed to sign request" });
  }
}
