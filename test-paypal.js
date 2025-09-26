const paypalUtils = require('./utils/paypal');

async function testPayPalConfig() {
  try {
    console.log('=== TESTING PAYPAL CONFIGURATION ===');
    
    // Test 1: Check environment variables
    console.log('\n1. Environment Variables Check:');
    console.log('PAYPAL_MODE:', process.env.PAYPAL_MODE);
    console.log('PAYPAL_CLIENT_ID exists:', !!process.env.PAYPAL_CLIENT_ID);
    console.log('PAYPAL_CLIENT_SECRET exists:', !!process.env.PAYPAL_CLIENT_SECRET);
    console.log('PAYPAL_BUSINESS_EMAIL:', process.env.PAYPAL_BUSINESS_EMAIL);
    
    // Test 2: Test authentication
    console.log('\n2. Testing PayPal Authentication:');
    const token = await paypalUtils.getAccessToken();
    console.log('✅ Authentication successful');
    console.log('Token length:', token.length);
    
    // Test 3: Test invoice creation (without sending)
    console.log('\n3. Testing Invoice Creation:');
    const testInvoiceData = {
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      customerPhone: "1234567890",
      customerAddress: "123 Test St",
      customerCity: "Test City",
      customerCountry: "US",
      productTitle: "Test Product",
      refNo: "TEST-001",
      price: 100.00,
      productCategory: "test"
    };
    
    const result = await paypalUtils.createInvoice(testInvoiceData);
    console.log('✅ Invoice created successfully');
    console.log('Invoice ID:', result.invoiceId);
    console.log('Invoice Number:', result.invoiceNumber);
    console.log('Status:', result.status);
    
    console.log('\n=== ALL TESTS PASSED ===');
    console.log('Your PayPal configuration is working correctly!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error('Error:', error.message);
    
    if (error.message.includes('PayPal business email not configured')) {
      console.log('\nTo fix this:');
      console.log('1. Go to your PayPal Developer Dashboard');
      console.log('2. Create or use an existing PayPal business account');
      console.log('3. Update PAYPAL_BUSINESS_EMAIL in your .env file');
      console.log('4. Make sure the email is verified and associated with your PayPal business account');
    }
  }
}

// Run the test
testPayPalConfig(); 