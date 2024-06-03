import "dotenv/config";
import express from "express";
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
      customerId: String(customerID),
    });

    // Send access token to front-end
    const clientToken = response.clientToken;
    console.log("customerID :" + customerID);
    console.log("response : ", response);
    return clientToken;
  } catch (error) {
    console.error("Fail to generate Access Token :", error);
  }
};

app.post("/clientToken", async (req, res) => {
  try {
    const customerID = req.body.customerID;
    console.log("req.body customerID", req.body.customerID);
    const clientToken = await generateAccessToken(customerID);

    if(!clientToken) {
      return res.status(400).json({error: "Invalid customer ID"});
    }
    return res.json({ clientToken });
  } catch (error) {
    res.status(500).send("Fail to generate Access Token");
  }
});

app.get("/", async (req, res) => {
  // render paypal view
  res.render("index", {
    currency: BRAINTREE_CURRENCY,
  })
});

app.post("/transaction/create", async (req, res) => {
  try {
    const nonceFromTheClient = req.body.payment_method_nonce;
    const deviceDataFromTheClient = req.body.deviceData;
    
    console.log("req.body", req.body);

    gateway.transaction.sale({
      amount: req.body.amount,
      paymentMethodNonce: nonceFromTheClient,
      deviceData: deviceDataFromTheClient,
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