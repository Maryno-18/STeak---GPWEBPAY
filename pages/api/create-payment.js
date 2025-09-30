import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { orderNumber, amount, email } = req.body;

  // Testovací údaje – přes ENV proměnné
  const MERCHANTNUMBER = process.env.GP_MERCHANT_NUMBER;
  const OPERATION = "CREATE_ORDER";
  const CURRENCY = "203"; // CZK
  const DEPOSITFLAG = "1";
  const RETURN_URL = "https://www.steak-restaurant.cz/payment-result";

  // GP WebPay očekává částku v haléřích
  const AMOUNT = amount * 100;

  // Data pro podpis v přesném pořadí
  const dataToSign = [
    MERCHANTNUMBER,
    OPERATION,
    orderNumber,
    AMOUNT,
    CURRENCY,
    DEPOSITFLAG,
    RETURN_URL,
    email,
  ].join("|");

  // Vytvoření podpisu pomocí privátního klíče
  const privateKey = process.env.GP_PRIVATE_KEY.replace(/\\n/g, "\n"); // pokud je v ENV s \n
  const passphrase = process.env.GP_PRIVATE_KEY_PASSPHRASE || undefined;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(dataToSign);
  const digest = signer.sign(
    { key: privateKey, passphrase },
    "base64"
  );

  // Připravit redirect URL
  const redirectUrl =
    "https://test.3dsecure.gpwebpay.com/pgw/order.do?" +
    `MERCHANTNUMBER=${MERCHANTNUMBER}&` +
    `OPERATION=${OPERATION}&` +
    `ORDERNUMBER=${orderNumber}&` +
    `AMOUNT=${AMOUNT}&` +
    `CURRENCY=${CURRENCY}&` +
    `DEPOSITFLAG=${DEPOSITFLAG}&` +
    `URL=${encodeURIComponent(RETURN_URL)}&` +
    `EMAIL=${encodeURIComponent(email)}&` +
    `DIGEST=${encodeURIComponent(digest)}`;

  return res.status(200).json({ redirectUrl });
}
