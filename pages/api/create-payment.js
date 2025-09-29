import fs from "fs";
import path from "path";
import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { orderNumber, amount, email } = req.body;

  // Merchant údaje
  const MERCHANTNUMBER = process.env.GP_MERCHANT_NUMBER; // nastavíš ve Vercel Env
  const CURRENCY = "203"; // CZK
  const DEPOSITFLAG = "1";
  const OPERATION = "CREATE_ORDER";
  const RETURN_URL = "https://www.steak-restaurant.cz/payment-result";

  // Částka v haléřích
  const AMOUNT = amount * 100;

  // Soukromý klíč – nahraješ do /keys/gpwebpay-pvk.key
  const privateKeyPath = path.join(process.cwd(), "keys", "gpwebpay-pvk.key");
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

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

  // Vytvoření podpisu
  const sign = crypto.createSign("sha1");
  sign.update(digestText);
  const digest = sign.sign(privateKey, "base64");

  // Redirect URL
  const gpUrl = "https://test.3dsecure.gpwebpay.com/pgw/order.do";
  const redirectUrl = `${gpUrl}?${digestText.replace(/\|/g, "&")}&DIGEST=${encodeURIComponent(digest)}`;

  return res.status(200).json({ redirectUrl });
}
