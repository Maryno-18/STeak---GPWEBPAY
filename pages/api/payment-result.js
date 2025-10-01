import crypto from "crypto";
import url from "url";
import querystring from "querystring";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).send("Only GET or POST allowed");
  }

  const params = await new Promise((resolve) => {
    if (req.method === "POST") {
      let raw = "";
      req.on("data", chunk => raw += chunk);
      req.on("end", () => resolve(querystring.parse(raw)));
    } else {
      resolve(url.parse(req.url, true).query);
    }
  });

  const {
    ORDERNUMBER,
    OPERATION,
    PRCODE,
    SRCODE,
    RESULTTEXT,
    DIGEST,
    DIGEST1,
    ...rest
  } = params;

  const gpPublicKey = process.env.GP_PUBLIC_KEY;
  const merchantNumber = process.env.GP_MERCHANT_NUMBER;

  const AMOUNT = rest.AMOUNT || "0";
  const CURRENCY = rest.CURRENCY || "0";

  const dataToVerify = [
    OPERATION,
    ORDERNUMBER,
    merchantNumber,
    AMOUNT,
    CURRENCY,
    PRCODE
  ].join("|");

  const dataToVerify1 = `${dataToVerify}|${SRCODE}`;

  const verify = (data, signature) => {
    const verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(data, "utf8");
    return verifier.verify(gpPublicKey, signature, "base64");
  };

  const digestOk = verify(dataToVerify, DIGEST);
  const digest1Ok = verify(dataToVerify1, DIGEST1);

  if (!digestOk || !digest1Ok) {
    return res.status(400).send("Invalid signature");
  }

  if (process.env.MAKE_WEBHOOK_URL) {
    await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ORDERNUMBER,
        OPERATION,
        PRCODE,
        SRCODE,
        RESULTTEXT,
        AMOUNT,
        CURRENCY,
        ...rest
      }),
    });
  }

  return res.status(200).send("Payment OK");
}
