import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  let { orderNumber, amount } = req.body;

  // pokud nepřijde orderNumber z Make, vygenerujeme unikátní
  if (!orderNumber) {
    orderNumber = Date.now().toString().slice(-10); // max. 10 číslic
  }

  const MERCHANTNUMBER = process.env.GP_MERCHANT_NUMBER;
  const OPERATION = "CREATE_ORDER";
  const CURRENCY = "203"; // CZK
  const DEPOSITFLAG = "1";
  const RETURN_URL = "https://www.steak-restaurant.cz/payment-result";

  // částka v haléřích
  const AMOUNT = amount * 100;

  // povinná pole pro podpis
  const dataToSign = [
    MERCHANTNUMBER,
    OPERATION,
    orderNumber,
    AMOUNT,
    CURRENCY,
    DEPOSITFLAG,
    RETURN_URL
  ].join("|");

  // privátní klíč a passphrase
  const privateKey = process.env.GP_PRIVATE_KEY.replace(/\\n/g, "\n");
  const passphrase = process.env.GP_PRIVATE_KEY_PASSPHRASE || undefined;

  // podpis přes RSA-SHA1
  const signer = crypto.createSign("RSA-SHA1");
  signer.update(dataToSign);
  const digest = signer.sign({ key: privateKey, passphrase }, "base64");

  // redirect URL
  const redirectUrl =
    "https://test.3dsecure.gpwebpay.com/pgw/order.do?" +
    `MERCHANTNUMBER=${MERCHANTNUMBER}&` +
    `OPERATION=${OPERATION}&` +
    `ORDERNUMBER=${orderNumber}&` +
    `AMOUNT=${AMOUNT}&` +
    `CURRENCY=${CURRENCY}&` +
    `DEPOSITFLAG=${DEPOSITFLAG}&` +
    `URL=${encodeURIComponent(RETURN_URL)}&` +
    `DIGEST=${encodeURIComponent(digest)}`;

  return res.status(200).json({ redirectUrl });
}
