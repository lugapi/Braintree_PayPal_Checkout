// Fonction to configure each PayPal button
function configurePayPalButton(paypalCheckoutInstance, jsonContent, containerId, fundingSource = paypal.FUNDING.PAYPAL) {
    return paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
        },
        fundingSource: fundingSource,
        createOrder: function () {
            return paypalCheckoutInstance.createPayment(jsonContent);
        },

        onShippingChange: function (data, actions) {
            // Perform some validation or calculation logic on 'data'

            console.log("onShippingChange data : ", data)
            console.log("onShippingChange lineItems : ", jsonContent.lineItems)

            if (data.shipping_address.country_code === 'US') {
                console.log("Shipping country selected " + data.shipping_address.country_code)
                return paypalCheckoutInstance.updatePayment({
                    amount: jsonContent.amount, // Required
                    currency: jsonContent.currency,
                    lineItems: jsonContent.lineItems, // Required
                    paymentId: data.paymentId, // Required
                    // shippingOptions: shippingOptions, // Optional
                });
            } else if (data.shipping_address.country_code === 'FR') {
                console.log("Shipping not allowed in " + data.shipping_address.country_code)
                return actions.reject();
            }

            return actions.resolve();
        },

        onApprove: function (data, actions) {
            return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
                console.log('PayPal payment token', payload);
                document.querySelector('.PPresult pre').innerHTML = JSON.stringify(payload, 0, 2);
                fetch('/transaction/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        payment_method_nonce: payload.nonce,
                        amount: jsonContent.amount
                    })
                }).then(function (result) {
                    if (result.ok) {
                        return result.json();
                    } else {
                        return result.text().then(function (text) {
                            return Promise.reject(text);
                        });
                    }
                }).then(function (result) {
                    document.querySelector('.PPresultCreateTransaction pre').innerHTML = JSON.stringify(result, 0, 2);
                });
            });
        },
        onCancel: function (data) {
            console.log('PayPal payment cancelled', JSON.stringify(data, 0, 2));
            document.querySelector('.PPresult pre').innerHTML = JSON.stringify(data, 0, 2);
        },
        onError: function (err) {
            console.error('PayPal error', err);
        }
    }).render(containerId);
}

// Fonction principale pour charger les boutons PayPal
function loadPPButton(jsonContent) {
    braintree.client.create({
        authorization: clientToken
    }).then(function (clientInstance) {
        return braintree.paypalCheckout.create({
            client: clientInstance
        });
    }).then(function (paypalCheckoutInstance) {
        // Conditionally include 'enable-funding' property
        const enableFundingOption = document.getElementById('enableFundingCheckbox').checked ? 'paylater' : null;

        const sdkOptions = {
            components: 'buttons,messages',
            currency: currency,
            intent: 'capture',
            dataAttributes: {
                amount: String(jsonContent.amount)
            }
        };

        // Include 'enable-funding' only if the checkbox is checked
        if (enableFundingOption) {
            sdkOptions['enable-funding'] = enableFundingOption;
        }

        return paypalCheckoutInstance.loadPayPalSDK(sdkOptions);
    }).then(function (paypalCheckoutInstance) {
        // Load standard PayPal button
        configurePayPalButton(paypalCheckoutInstance, jsonContent, '#paypal-button');

        // Load BNPL PayPal button if BNPL is checked on the front-end
        if (document.getElementById('enableFundingCheckbox').checked) {
            configurePayPalButton(paypalCheckoutInstance, jsonContent, '#paypal-paylater-button', paypal.FUNDING.PAYLATER);
        }
    }).then(function () {
        // This function will be called when the PayPal button is set up and ready to be used
        console.log("Buttons displayed and ready!");
    });
}

document.getElementById('loadPPButton').addEventListener('click', function () {
    const jsonContent = editor.get();
    loadPPButton(jsonContent);
});

document.getElementById('savePP').addEventListener('change', function () {
    const checkbox = document.getElementById('savePP');
    if (checkbox.checked) {
        jsonContent.requestBillingAgreement = true;
        jsonContent.billingAgreementDetails = {};
        jsonContent.billingAgreementDetails.description = "PayPal Billing Agreement Description test";
    } else {
        delete jsonContent.requestBillingAgreement;
        delete jsonContent.billingAgreementDetails;
    }
    editor.set(jsonContent);
    // editor.expandAll();
});