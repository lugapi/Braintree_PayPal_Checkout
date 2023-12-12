function loadPPButton(jsonContent) {
    // Create a client.
    braintree.client.create({
        authorization: clientToken
    }).then(function (clientInstance) {
        // Create a PayPal Checkout component.
        return braintree.paypalCheckout.create({
            client: clientInstance
        });
    }).then(function (paypalCheckoutInstance) {
        return paypalCheckoutInstance.loadPayPalSDK({
            currency: 'USD',
            intent: 'capture'
        });
    }).then(function (paypalCheckoutInstance) {
        return paypal.Buttons({
            fundingSource: paypal.FUNDING.PAYPAL,

            createOrder: function () {
                return paypalCheckoutInstance.createPayment(jsonContent);
            },

            //   onShippingChange: function (data, actions) {
            //     // Perform some validation or calculation logic on 'data'

            //     if ( /* need to update shipping or lineItems */ ) {
            //       return paypalCheckoutInstance.updatePayment({
            //         amount: 10.00,              // Required
            //         currency: 'USD',
            //         lineItems: [...],           // Required
            //         paymentId: data.paymentId,  // Required
            //         shippingOptions: [...],     // Optional       
            //       });
            //     } else if (/* address not supported */) {
            //       return actions.reject();
            //     }

            //     return actions.resolve();
            //   },

            onApprove: function (data, actions) {
                return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
                    // Submit 'payload.nonce' to your server
                    console.log('PayPal payment token', payload);
                    document.querySelector('.PPresult pre').innerHTML = JSON.stringify(payload, 0, 2);
                    // send the payload to /transaction/create endpoint
                    fetch('/transaction/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            payment_method_nonce: payload.nonce
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
                    })
                });
            },

            onCancel: function (data) {
                console.log('PayPal payment cancelled', JSON.stringify(data, 0, 2));
                document.querySelector('.PPresult pre').innerHTML = JSON.stringify(data, 0, 2);
            },

            onError: function (err) {
                console.error('PayPal error', err);
            }
        }).render('#paypal-button');
    }).then(function () {
        // The PayPal button will be rendered in an html element with the ID
        // 'paypal-button'. This function will be called when the PayPal button
        // is set up and ready to be used
    });
}

document.getElementById('loadPPButton').addEventListener('click', function () {
    const jsonContent = editor.get();
    loadPPButton(jsonContent);
})