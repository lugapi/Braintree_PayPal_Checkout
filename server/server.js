import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import path from "path";

import braintree from "braintree";

const app = express();

// static file
app.use(express.static("client"));

// analyse POST params sent in JSON
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join("views"));

const {
  BRAINTREE_MERCHANT_ID,
  BRAINTREE_API_KEY,
  BRAINTREE_API_SECRET,
  BRAINTREE_CURRENCY,
  PORT = 8887
} = process.env;

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: BRAINTREE_MERCHANT_ID,
  publicKey: BRAINTREE_API_KEY,
  privateKey: BRAINTREE_API_SECRET
});

const generateAccessToken = async (customerID = null) => {
  try {
    const response = await gateway.clientToken.generate({
      customerId: customerID
    });

    // Send access token to front-end
    const clientToken = response.clientToken;
    return clientToken;
  } catch (error) {
    console.error("Fail to generate Access Token :", error);
  }
};

app.get("/", (req, res) => {
  res.send("Hello Braintree !");
});

app.get("/paypal", async (req, res) => {
  try {
    const clientToken = await generateAccessToken();

    res.render("index", {
      clientToken: clientToken,
      currency: BRAINTREE_CURRENCY
    });
  } catch (error) {
    res.status(500).send("Erreur lors de la génération du jeton client");
  }
});

app.post("/transaction/create", async (req, res) => {
  try {
    const nonceFromTheClient = req.body.payment_method_nonce;
    console.log("req.body", req.body);

    gateway.transaction.sale({
      amount: req.body.amount,
      paymentMethodNonce: nonceFromTheClient,
      // deviceData: deviceDataFromTheClient,
      options: {
        submitForSettlement: true
      }
    }).then(result => {
      console.log(result);
      res.json(result);
    });


  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({
      error: "Failed to create order."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);
});