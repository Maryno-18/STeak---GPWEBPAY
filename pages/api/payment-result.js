import crypto from "crypto";

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
    OPERATION,
    ORDERNUMBER,
    MD,
    PRCODE,
    SRCODE,
    RESULTTEXT,
    USERPARAM1,
    ADDINFO,
    DIGEST,
    DIGEST1,
    ...rest
  } = params;

  const gpPublicKey = process.env.GP_PUBLIC_KEY.replace(/\\n/g, "\n");
  const merchantNumber = process.env.GP_MERCHANT_NUMBER;

  const fields = [
    OPERATION,
    ORDERNUMBER,
    MD || "",
    PRCODE || "",
    SRCODE || "",
    RESULTTEXT || "",
    USERPARAM1 || "",
    ADDINFO || ""
  ];
  const dataToVerify = fields.join("|");
  const dataToVerify1 = `${dataToVerify}|${merchantNumber}`;

  const verify = (data, signature) => {
    const verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(data);
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
        OPERATION,
        ORDERNUMBER,
        PRCODE,
        SRCODE,
        RESULTTEXT,
        USERPARAM1,
        ADDINFO,
        ...rest
      }),
    });
  }

  return res.status(200).send("Payment OK");
}
