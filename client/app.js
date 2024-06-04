// Fonction to configure each PayPal button

styles = {
    layout: 'vertical',
    color: 'black',
    shape: 'rect',
    label: 'paypal'
}

BNPLstyles = {
    layout: 'vertical',
    color: 'blue',
    shape: 'rect',
    label: 'paypal'
}

const checkboxConditionsDiv = document.querySelector("#checkDiv");
const checkboxConditions = document.querySelector("#check");

function configurePayPalButton(paypalCheckoutInstance, styles, jsonContent, containerId, fundingSource = paypal.FUNDING.PAYPAL, customerID = null) {
    console.log('funding source : ', fundingSource)
    const options = {
        style: styles,
        fundingSource: fundingSource,
        // onInit is called when the button first renders
        onInit(data, actions) {

            checkboxConditionsDiv.classList.remove("hidden");
            
            // Disable the buttons
            actions.disable();

            // Listen for changes to the checkbox
            checkboxConditions.addEventListener("change", function (event) {
                // Enable or disable the button when it is checked or unchecked
                if (event.target.checked) {
                    actions.enable();
                } else {
                    actions.disable();
                }
            });
        },
        onClick: function (data, actions) {
            console.log('onClick');
            if (!checkboxConditions.checked) {
                alert('Please check the conditions to proceed to the payment');
            }
        },
        createOrder: function () {
            return paypalCheckoutInstance.createPayment(jsonContent);
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
                        amount: jsonContent.amount,
                        deviceData: document.querySelector('#device_data') ? document.querySelector('#device_data').value : null,
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
    }

    // Check if customerID is provided
    if (customerID) {
        // If yes, add onShippingChange logic to the options object
        options.onShippingChange = function (data, actions) {
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
        }
    }

    return paypal.Buttons(options).render(containerId);
}

function loadBNPLBanner(jsonContent) {
    console.log("jsonContent", jsonContent);

    console.log("loadBNPLBanner");
    // Load the script
    const bannerDiv = document.querySelector('#bnpl');
    const banner = document.querySelector('#bnpl > div');
    banner.setAttribute('data-pp-amount', jsonContent.amount);

    console.log("banner : ", banner);

    bannerDiv.classList.remove('hidden');
}


// Fonction principale pour charger les boutons PayPal
async function loadPPButton(jsonContent) {
    document.getElementById('paypal-button').innerHTML = "";
    document.getElementById('paypal-paylater-button').innerHTML = "";
    loadBNPLBanner(jsonContent);
    try {

        const clientToken = await getClientToken();
        document.getElementById('clientTokenReturned').innerHTML = clientToken

        const clientInstance = await braintree.client.create({
            authorization: clientToken
        });

        const dataCollectorInstance = await braintree.dataCollector.create({
            client: clientInstance
        });

        var form = document.getElementById('device-data-form');
        var deviceDataInput = form['device_data'];

        if (deviceDataInput == null) {
            deviceDataInput = document.createElement('input');
            deviceDataInput.name = 'device_data';
            deviceDataInput.id = 'device_data';
            deviceDataInput.type = 'hidden';
            form.appendChild(deviceDataInput);
        }

        deviceDataInput.value = dataCollectorInstance.deviceData;

        console.log('Device Data:', deviceDataInput.value);


        braintree.client.create({
            authorization: clientToken
        }).then(function (clientInstance) {
            return braintree.paypalCheckout.create({
                client: clientInstance,
                autoSetDataUserIdToken: true,
            });
        }).then(function (paypalCheckoutInstance) {
            // Conditionally include 'enable-funding' property
            const enableFundingOption = document.getElementById('enableFundingCheckbox').checked ? 'paylater' : null;

            const sdkOptions = {
                components: 'buttons,messages',
                currency: jsonContent.currency,
                intent: jsonContent.intent,
                dataAttributes: {
                    amount: jsonContent.amount
                },
            };

            // Include 'enable-funding' only if the checkbox is checked
            if (enableFundingOption) {
                sdkOptions['enable-funding'] = enableFundingOption;
            }

            return paypalCheckoutInstance.loadPayPalSDK(sdkOptions);
        }).then(function (paypalCheckoutInstance) {

            let custValue = null;
            document.getElementById('customerID').value !== "" ? custValue = null : custValue = document.getElementById('customerID').value;

            // Load standard PayPal button
            configurePayPalButton(paypalCheckoutInstance, styles, jsonContent, '#paypal-button', paypal.FUNDING.PAYPAL, custValue);

            // Load BNPL PayPal button if BNPL is checked on the front-end
            if (document.getElementById('enableFundingCheckbox').checked) {
                configurePayPalButton(paypalCheckoutInstance, BNPLstyles, jsonContent, '#paypal-paylater-button', paypal.FUNDING.PAYLATER, custValue);
            }
        }).then(function () {
            // This function will be called when the PayPal button is set up and ready to be used
            console.log("Buttons displayed and ready!");
        });
    } catch (error) {
        console.error('Error getting client token:', error);
    }
}

async function getClientToken() {
    try {
        const result = await fetch('/clientToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerID: document.getElementById('customerID').value,
            })
        });

        if (result.ok) {
            const data = await result.json();
            return data.clientToken;
        } else {
            const text = await result.text();
            return text;
        }
    } catch (error) {
        console.error('Error getting client token:', error);
        throw error;
    }
}

document.getElementById('loadPPButton').addEventListener('click', function () {
    const jsonContent = editor.get();
    loadPPButton(jsonContent);
});

const checkboxSavePP = document.getElementById('savePP');
const checkboxLineItems = document.getElementById('lineItems');

checkboxSavePP.addEventListener('change', function () {
    if (checkboxSavePP.checked) {
        jsonContent.requestBillingAgreement = true;
        jsonContent.billingAgreementDetails = {};
        jsonContent.billingAgreementDetails.description = "PayPal Billing Agreement Description test";
    } else {
        delete jsonContent.requestBillingAgreement;
        delete jsonContent.billingAgreementDetails;
    }
    editor.set(jsonContent);
    editor.expandAll();
});

checkboxLineItems.addEventListener('change', function () {
    if (checkboxLineItems.checked) {
        jsonContent.lineItems = [{
            quantity: 2,
            unitAmount: 40,
            unitTaxAmount: 0,
            name: "Nice Shoes",
            description: "The best Shoes",
            productCode: "SKU001"
        }, {
            quantity: 1,
            unitAmount: 20,
            unitTaxAmount: 0,
            name: "Nice Dress",
            description: "The best Dress",
            productCode: "SKU002"
        }]
    } else {
        delete jsonContent.lineItems;
    }
    editor.set(jsonContent);
    editor.expandAll();
});