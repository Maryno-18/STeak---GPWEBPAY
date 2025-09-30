import crypto from "crypto";
import { X509Certificate } from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).send("Only GET or POST allowed");
  }

  const url = require("url");
  const querystring = require("querystring");

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

  const merchantNumber = process.env.GP_MERCHANT_NUMBER;
  const certPem = process.env.GP_PUBLIC_KEY.replace(/\\n/g, "\n");

  // z certifikátu vytáhneme public key
  const cert = new X509Certificate(certPem);
  const publicKey = cert.publicKey;

  const keys = Object.keys(params).filter(k => k !== "DIGEST" && k !== "DIGEST1");
  const dataToVerify = keys.sort().map(k => params[k]).join("|");
  const dataToVerify1 = `${dataToVerify}|${merchantNumber}`;

  const verify = (data, signature) => {
    const verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(data);
    return verifier.verify(publicKey, signature, "base64");
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
      body: JSON.stringify({ ORDERNUMBER, OPERATION, PRCODE, SRCODE, RESULTTEXT, ...rest }),
    });
  }

  return res.status(200).send("Payment OK");
}
