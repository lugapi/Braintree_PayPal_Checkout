const jsonContent = {
    flow: 'checkout', // Required
    amount: "100.00", // Required
    currency: currency, // Required, must match the currency passed in with loadPayPalSDK

    intent: 'capture', // Must match the intent passed in with loadPayPalSDK

    enableShippingAddress: true,
    shippingAddressEditable: false,
    lineItems: [{
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
    }],
    shippingAddressOverride: {
        recipientName: 'Scruff McGruff',
        line1: '1234 Main St.',
        line2: 'Unit 1',
        city: 'Chicago',
        countryCode: 'US',
        postalCode: '60652',
        state: 'IL',
        phone: '123.456.7890'
    }
}

const container = document.getElementById("jsoneditor");
const options = {
    modes: ["text", "code", "tree", "form", "view"],
    mode: "tree",
    search: true,
};
const editor = new JSONEditor(container, options);

editor.set(jsonContent);
// editor.expandAll();