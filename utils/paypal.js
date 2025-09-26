const axios = require('axios');

console.log('PayPal utilities loaded - using REST API');

// Validate environment variables
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('PAYPAL_MODE:', process.env.PAYPAL_MODE);
console.log('PAYPAL_CLIENT_ID exists:', !!process.env.PAYPAL_CLIENT_ID);
console.log('PAYPAL_CLIENT_SECRET exists:', !!process.env.PAYPAL_CLIENT_SECRET);
console.log('EMAIL_USER:', process.env.EMAIL_USER);

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.error('❌ Missing required PayPal environment variables!');
  console.error('Please check your .env file for PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
}

// PayPal REST API configuration
const normalizedMode = ((process.env.PAYPAL_MODE || 'sandbox').toString().trim().toLowerCase());
const PAYPAL_BASE_URL = normalizedMode === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

console.log('PayPal Base URL:', PAYPAL_BASE_URL);

let accessToken = null;
let tokenExpiry = 0;

// Get PayPal access token
async function getAccessToken() {
  try {
    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    console.log('=== PAYPAL AUTHENTICATION DEBUG ===');
    console.log('PayPal Mode (normalized):', normalizedMode);
    console.log('PayPal Base URL:', PAYPAL_BASE_URL);

    const rawClientId = process.env.PAYPAL_CLIENT_ID || '';
    const rawClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    const clientId = rawClientId.trim();
    const clientSecret = rawClientSecret.trim();

    console.log('Client ID length (raw -> trimmed):', rawClientId.length, '->', clientId.length);
    console.log('Client Secret length (raw -> trimmed):', rawClientSecret.length, '->', clientSecret.length);

    const authUrl = `${PAYPAL_BASE_URL}/v1/oauth2/token`;
    console.log('Auth URL:', authUrl);

    const formBody = new URLSearchParams({ grant_type: 'client_credentials' }).toString();

    const response = await axios.post(
      authUrl,
      formBody,
      {
        auth: {
          username: clientId,
          password: clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    console.log('=== AUTHENTICATION SUCCESS ===');
    console.log('Response status:', response.status);

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Expire 1 minute early
    
    console.log('PayPal access token obtained');
    return accessToken;
  } catch (error) {
    console.error('=== PAYPAL AUTHENTICATION ERROR ===');
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', error.response?.data);
    console.error('Error message:', error.message);

    if (error.response?.data?.error === 'invalid_client') {
      throw new Error(`PayPal authentication failed: ${error.response.data.error_description}. Please ensure you are using the Sandbox app Client ID and Secret from "My Apps & Credentials > Sandbox", and that there are no extra spaces.`);
    }
    
    throw new Error(`Failed to authenticate with PayPal: ${error.response?.data?.error_description || error.message}`);
  }
}

const paypalUtils = {
  // Create PayPal invoice
  createInvoice: async (invoiceData) => {
    try {
      // Validate PayPal business email configuration
      const paypalBusinessEmail = process.env.PAYPAL_BUSINESS_EMAIL;
      if (!paypalBusinessEmail || paypalBusinessEmail === 'your-paypal-business-email@example.com') {
        throw new Error('PayPal business email not configured. Please set PAYPAL_BUSINESS_EMAIL in your .env file to a valid PayPal business account email.');
      }
      
      const token = await getAccessToken();
      
      const invoicePayload = {
        detail: {
          currency_code: "USD",
          note: `Invoice for ${invoiceData.productTitle} - Ref: ${invoiceData.refNo}`,
          terms: "Payment due upon receipt",
          memo: "Thank you for your purchase from Autexline"
        },
        invoicer: {
          name: {
            given_name: "Autexline",
            surname: "Automotive"
          },
          email_address: process.env.PAYPAL_BUSINESS_EMAIL || "your-paypal-business-email@example.com",
          phone_contact: {
            phone_number_details: {
              country_code: "1",
              national_number: "5551234567"
            }
          },
          website: "https://autexline.com",
          logo_url: "https://autexline.com/logo.png",
          tax_id: "123456789",
          additional_notes: "Professional automotive services"
        },
        primary_recipients: [
          {
            billing_info: {
              name: {
                given_name: invoiceData.customerName.split(' ')[0] || invoiceData.customerName,
                surname: invoiceData.customerName.split(' ').slice(1).join(' ') || ''
              },
              email_address: invoiceData.customerEmail,
              phone_contact: {
                phone_number_details: {
                  country_code: "1",
                  national_number: (invoiceData.customerPhone || "5551234567").replace(/\D/g, '').slice(-10)
                }
              },
              address: {
                address_line_1: invoiceData.customerAddress || "N/A",
                admin_area_2: invoiceData.customerCity || "N/A",
                admin_area_1: invoiceData.customerCountry || "N/A",
                country_code: "US"
              }
            },
            shipping_info: {
              name: {
                given_name: invoiceData.customerName.split(' ')[0] || invoiceData.customerName,
                surname: invoiceData.customerName.split(' ').slice(1).join(' ') || ''
              },
              address: {
                address_line_1: invoiceData.customerAddress || "N/A",
                admin_area_2: invoiceData.customerCity || "N/A",
                admin_area_1: invoiceData.customerCountry || "N/A",
                country_code: "US"
              }
            }
          }
        ],
        items: [
          {
            name: invoiceData.productTitle,
            description: `Product Reference: ${invoiceData.refNo}`,
            quantity: "1",
            unit_amount: {
              currency_code: "USD",
              value: invoiceData.price.toString()
            },
            unit_of_measure: "QUANTITY"
          }
        ],
        configuration: {
          allow_tip: false,
          tax_calculated_after_discount: false,
          tax_inclusive: false
        },
        amount: {
          currency_code: "USD",
          value: invoiceData.price.toString(),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: invoiceData.price.toString()
            }
          }
        }
      };
      
      const response = await axios.post(`${PAYPAL_BASE_URL}/v2/invoicing/invoices`, 
        invoicePayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract invoice ID from the href URL if id is not directly available
      let invoiceId = response.data.id;
      if (!invoiceId && response.data.href) {
        const hrefParts = response.data.href.split('/');
        invoiceId = hrefParts[hrefParts.length - 1];
      }
      
      // Get the full invoice details to extract invoice number and other info
      let fullInvoiceDetails;
      try {
        fullInvoiceDetails = await paypalUtils.getInvoice(invoiceId);
      } catch (error) {
        console.warn('Warning: Could not retrieve full invoice details:', error.message);
        fullInvoiceDetails = { links: [], detail: {}, status: 'CREATED' };
      }
      
      // Extract useful links from the full invoice response
      const links = fullInvoiceDetails.links || [];
      const viewLink = links.find(link => link.rel === 'view')?.href;
      const editLink = links.find(link => link.rel === 'edit')?.href;
      
      // Extract invoice number from the detail section of the full response
      const invoiceNumber = fullInvoiceDetails.detail?.invoice_number;
      
      // Extract status from the full response
      const status = fullInvoiceDetails.status;
      
      // Generate customer-facing invoice URL
      // Note: PayPal provides the actual customer URL in the metadata
      let customerInvoiceUrl;
      if (normalizedMode === 'live') {
        // Live mode - use the standard PayPal invoice URL
        customerInvoiceUrl = `https://www.paypal.com/invoice/payerViewDetails/${invoiceId}`;
      } else {
        // Sandbox mode - use the recipient_view_url from PayPal metadata if available
        customerInvoiceUrl = fullInvoiceDetails.detail?.metadata?.recipient_view_url || 
                           `https://www.sandbox.paypal.com/invoice/payerViewDetails/${invoiceId}`;
      }
      
      console.log('Invoice created successfully:', {
        invoiceId,
        invoiceNumber,
        status,
        customerInvoiceUrl
      });
      
      return {
        success: true,
        invoiceId: invoiceId,
        invoiceNumber: invoiceNumber,
        status: status,
        links: links,
        viewLink: viewLink,
        editLink: editLink,
        customerInvoiceUrl: customerInvoiceUrl,
        paypalMode: normalizedMode
      };
    } catch (error) {
      console.error('Error creating PayPal invoice:', error.response?.data || error.message);
      throw new Error(`Failed to create PayPal invoice: ${error.response?.data?.message || error.message}`);
    }
  },

  // Send invoice to customer
  sendInvoice: async (invoiceId) => {
    try {
      // Validate invoice ID
      if (!invoiceId) {
        throw new Error('Invoice ID is required to send invoice');
      }
      
      const token = await getAccessToken();
      
      const response = await axios.post(
        `${PAYPAL_BASE_URL}/v2/invoicing/invoices/${invoiceId}/send`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Get updated invoice details after sending
      const invoiceDetails = await paypalUtils.getInvoice(invoiceId);
      
      return {
        success: true,
        status: response.data.status,
        invoiceDetails: invoiceDetails,
        message: 'Invoice sent successfully to customer'
      };
    } catch (error) {
      console.error('Error sending PayPal invoice:', error.response?.data || error.message);
      throw new Error(`Failed to send PayPal invoice: ${error.response?.data?.message || error.message}`);
    }
  },

  // Check if invoice is accessible to customers
  checkInvoiceAccessibility: async (invoiceId) => {
    try {
      const token = await getAccessToken();
      
      const response = await axios.get(
        `${PAYPAL_BASE_URL}/v2/invoicing/invoices/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const invoice = response.data;
      const isAccessible = invoice.status === 'SENT' || invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID';
      
      return {
        success: true,
        isAccessible,
        status: invoice.status,
        invoiceNumber: invoice.detail?.invoice_number,
        message: isAccessible ? 'Invoice is accessible to customers' : 'Invoice is not yet accessible to customers'
      };
    } catch (error) {
      console.error('Error checking invoice accessibility:', error.response?.data || error.message);
      return {
        success: false,
        isAccessible: false,
        error: error.message
      };
    }
  },

  // Get invoice status
  getInvoiceStatus: async (invoiceId) => {
    try {
      const token = await getAccessToken();
      
      const response = await axios.get(
        `${PAYPAL_BASE_URL}/v2/invoicing/invoices/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        status: response.data.status,
        invoiceId: response.data.id,
        invoiceNumber: response.data.detail?.invoice_number || response.data.invoice_number,
        amount: response.data.amount,
        dueDate: response.data.detail?.due_date || response.data.due_date,
        paymentTerms: response.data.detail?.payment_term || response.data.payment_term,
        links: response.data.links
      };
    } catch (error) {
      console.error('Error getting invoice status:', error.response?.data || error.message);
      throw new Error(`Failed to get invoice status: ${error.response?.data?.message || error.message}`);
    }
  },

  // Get invoice details
  getInvoice: async (invoiceId) => {
    try {
      const token = await getAccessToken();
      
      const response = await axios.get(
        `${PAYPAL_BASE_URL}/v2/invoicing/invoices/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error getting PayPal invoice:', error.response?.data || error.message);
      throw new Error(`Failed to get PayPal invoice: ${error.response?.data?.message || error.message}`);
    }
  }
};

module.exports = {
  getAccessToken,
  ...paypalUtils
}; 