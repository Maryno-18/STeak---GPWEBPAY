import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { orderNumber, amount, email } = req.body;

  // Merchant údaje – testovací
  const MERCHANTNUMBER = process.env.GP_MERCHANT_NUMBER;
  const CURRENCY = "203"; // CZK
  const DEPOSITFLAG = "1";
  const OPERATION = "CREATE_ORDER";
  const RETURN_URL = "https://www.steak-restaurant.cz/payment-result";

  // Částka v haléřích
  const AMOUNT = amount * 100;

  // Privátní klíč z ENV
  const privateKey = {
    key: process.env.GP_PRIVATE_KEY,
    passphrase: process.env.GP_PRIVATE_KEY_PASSPHRASE,
  };

  // Sestavení dat pro podpis
  const digestText = [
    `MERCHANTNUMBER=${MERCHANTNUMBER}`,
    `OPERATION=${OPERATION}`,
    `ORDERNUMBER=${orderNumber}`,
    `AMOUNT=${AMOUNT}`,
    `CURRENCY=${CURRENCY}`,
    `DEPOSITFLAG=${DEPOSITFLAG}`,
    `URL=${RETURN_URL}`,
    `EMAIL=${email}`
  ].join("|");

  try {
    // Podpis
    const sign = crypto.createSign("sha1");
    sign.update(digestText);
    const digest = sign.sign(privateKey, "base64");

    // Testovací URL GP WebPay
    const gpUrl = "https://test.3dsecure.gpwebpay.com/pgw/order.do";
    const redirectUrl = `${gpUrl}?${digestText.replace(/\|/g, "&")}&DIGEST=${encodeURIComponent(digest)}`;

    return res.status(200).json({ redirectUrl });
  } catch (error) {
    console.error("Signing error:", error);
    return res.status(500).json({ error: "Failed to sign request" });
  }
}
