import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
// "dotenv/config" est importé deux fois, une seule fois est nécessaire
// path doit être importé comme suit
import path from "path";

import braintree from "braintree";

const app = express();

// servez les fichiers statiques
app.use(express.static("client"));

// analysez les paramètres POST envoyés dans le corps au format JSON
app.use(express.json());

app.set("view engine", "ejs");
// utilisez "__dirname" pour obtenir le chemin absolu du répertoire actuel
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

// Utilisez une fonction asynchrone pour pouvoir utiliser "await"
const generateAccessToken = async (customerID = null) => {
  try {
    const response = await gateway.clientToken.generate({
      customerId: customerID // Correction de la syntaxe
    });

    // passez le clientToken à votre frontend
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
    // res.send(clientToken);

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
    // use the cart information passed from the front-end to calculate the order amount detals
    // const { cart } = req.body;
    // const {
    //   contentBody,
    //   header,
    //   trackingID
    // } = req.body;
    // const cart = contentBody;
    // console.log(
    //   "contentBody", JSON.stringify(contentBody)
    // )
    // const {
    //   jsonResponse,
    //   httpStatusCode
    // } = await createOrder(cart, header, trackingID);
    // res.status(httpStatusCode).json(jsonResponse);

    const nonceFromTheClient = req.body.payment_method_nonce;

    gateway.transaction.sale({
      amount: "10.00",
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