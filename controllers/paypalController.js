const paypalUtils = require('../utils/paypal');
const { sendMail } = require('../utils/mailer');

console.log('PayPal controller loaded');

const paypalController = {
  testPayPalAuth: async (req, res) => {
    try {
      console.log('=== TESTING PAYPAL AUTHENTICATION ===');
      
      // This will test the getAccessToken function
      const paypalUtils = require('../utils/paypal');
      
      // Try to get access token
      const token = await paypalUtils.getAccessToken();
      
      res.json({
        success: true,
        message: 'PayPal authentication successful',
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token'
      });
      
    } catch (error) {
      console.error('=== PAYPAL AUTH TEST FAILED ===');
      console.error('Error:', error.message);
      
      res.status(500).json({ 
        success: false,
        message: 'PayPal authentication failed',
        error: error.message 
      });
    }
  },

  createAndSendInvoice: async (req, res) => {
    try {
      console.log('Creating PayPal invoice...');
      
      const {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCity,
        customerCountry,
        productTitle,
        refNo,
        price,
        productId,
        productCategory,
        productImage
      } = req.body;

      if (!customerName || !customerEmail || !productTitle || !refNo || !price) {
        return res.status(400).json({ 
          message: 'Missing required fields: customerName, customerEmail, productTitle, refNo, price' 
        });
      }

      const invoiceData = {
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        customerCity: customerCity || '',
        customerCountry: customerCountry || '',
        productTitle,
        refNo,
        price: typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) || 0 : parseFloat(price) || 0,
        productId,
        productCategory,
        productImage
      };

      const paypalResult = await paypalUtils.createInvoice(invoiceData);

      // Validate that we have an invoice ID before sending
      if (!paypalResult.invoiceId) {
        throw new Error('Failed to get invoice ID from PayPal response');
      }

      const sendResult = await paypalUtils.sendInvoice(paypalResult.invoiceId);

      // Wait for PayPal to process the send request
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if the invoice is now accessible to customers
      const accessibilityCheck = await paypalUtils.checkInvoiceAccessibility(paypalResult.invoiceId);

      // Get the final invoice status after sending
      const finalInvoiceStatus = await paypalUtils.getInvoiceStatus(paypalResult.invoiceId);

      // Update the paypalResult with the final status and ensure we have the correct data
      const finalPaypalResult = {
        ...paypalResult,
        status: finalInvoiceStatus.status,
        invoiceNumber: finalInvoiceStatus.invoiceNumber || paypalResult.invoiceNumber,
        isAccessible: accessibilityCheck.isAccessible
      };

      // Only send emails if the invoice is accessible
      if (accessibilityCheck.isAccessible) {
        await sendInvoiceEmails(invoiceData, finalPaypalResult);
      }

      console.log('PayPal invoice processing completed successfully');

      res.json({
        success: true,
        message: 'PayPal invoice created and sent successfully',
        invoiceId: finalPaypalResult.invoiceId,
        invoiceNumber: finalPaypalResult.invoiceNumber,
        paypalStatus: finalPaypalResult.status,
        isAccessible: finalPaypalResult.isAccessible,
        customerInvoiceUrl: finalPaypalResult.customerInvoiceUrl
      });

    } catch (error) {
      console.error('Error creating PayPal invoice:', error.message);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create PayPal invoice',
        error: error.message 
      });
    }
  },

  getInvoiceDetails: async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      if (!invoiceId) {
        return res.status(400).json({ 
          message: 'Invoice ID is required' 
        });
      }

      console.log('Getting invoice details for:', invoiceId);
      
      const invoiceDetails = await paypalUtils.getInvoice(invoiceId);
      console.log('Invoice details retrieved:', invoiceDetails);

      res.json({
        success: true,
        invoice: invoiceDetails
      });

    } catch (error) {
      console.error('Error getting invoice details:', error);
      res.status(500).json({ 
        message: 'Failed to get invoice details',
        error: error.message 
      });
    }
  },

  getInvoiceStatus: async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      if (!invoiceId) {
        return res.status(400).json({ 
          message: 'Invoice ID is required' 
        });
      }

      console.log('Getting invoice status for:', invoiceId);
      
      const invoiceStatus = await paypalUtils.getInvoiceStatus(invoiceId);
      console.log('Invoice status retrieved:', invoiceStatus);

      res.json({
        success: true,
        status: invoiceStatus
      });

    } catch (error) {
      console.error('Error getting invoice status:', error);
      res.status(500).json({ 
        message: 'Failed to get invoice status',
        error: error.message 
      });
    }
  },

  checkInvoiceAccessibility: async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      if (!invoiceId) {
        return res.status(400).json({ 
          message: 'Invoice ID is required' 
        });
      }

      console.log('Checking invoice accessibility for:', invoiceId);
      
      const accessibilityResult = await paypalUtils.checkInvoiceAccessibility(invoiceId);
      console.log('Invoice accessibility check result:', accessibilityResult);

      res.json({
        success: true,
        accessibility: accessibilityResult
      });

    } catch (error) {
      console.error('Error checking invoice accessibility:', error);
      res.status(500).json({ 
        message: 'Failed to check invoice accessibility',
        error: error.message 
      });
    }
  }
};

// Helper function to send invoice emails
async function sendInvoiceEmails(invoiceData, paypalResult) {
  try {
    // Email to customer
    const customerEmailHtml = renderCustomerInvoiceEmail(invoiceData, paypalResult);
    await sendMail({
      to: invoiceData.customerEmail,
      subject: `Invoice for ${invoiceData.productTitle} - Autexline`,
      html: customerEmailHtml
    });

    // Email to admin
    const adminEmailHtml = renderAdminInvoiceEmail(invoiceData, paypalResult);
    const adminEmail = process.env.EMAIL_USER;
    await sendMail({
      to: adminEmail,
      subject: `New PayPal Invoice Generated - ${invoiceData.productTitle}`,
      html: adminEmailHtml
    });

  } catch (error) {
    console.error('Error sending invoice emails:', error);
  }
}

// Customer invoice email template
function renderCustomerInvoiceEmail(invoiceData, paypalResult) {
  // Generate a reliable PayPal invoice URL that works for both sandbox and live
  let paypalInvoiceLink;
  
  // First, try to use the customerInvoiceUrl from the backend
  if (paypalResult.customerInvoiceUrl) {
    paypalInvoiceLink = paypalResult.customerInvoiceUrl;
  } else {
    // Fallback URL generation
    if (paypalResult.paypalMode === 'live') {
      paypalInvoiceLink = `https://www.paypal.com/invoice/payerViewDetails/${paypalResult.invoiceId}`;
    } else {
      // For sandbox, try multiple URL patterns
      paypalInvoiceLink = `https://www.sandbox.paypal.com/invoice/payerViewDetails/${paypalResult.invoiceId}`;
    }
  }
  
  // Format invoice number display with fallback
  const invoiceNumberDisplay = paypalResult.invoiceNumber || 'N/A';
  const invoiceIdDisplay = paypalResult.invoiceId || 'N/A';
  
  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #111">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,.05)">
        <tr>
          <td style="padding: 24px 24px 12px 24px">
            <div style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: #16a34a; color: #fff; font-size: 12px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase">INVOICE READY</div>
            <h2 style="margin: 12px 0 4px 0; font-size: 22px">Your PayPal Invoice is Ready</h2>
            <p style="margin: 0; color: #555">We've generated a PayPal invoice for your purchase. Click the button below to view and complete your payment.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px 12px 24px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #fafafa; border: 1px solid #eee; border-radius: 8px">
              <tr>
                <td style="padding: 16px; vertical-align: top">
                  <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px">Product</div>
                  <div style="font-size: 16px; color: #111; font-weight: 700">${invoiceData.productTitle}</div>
                  <div style="font-size: 12px; color: #555; margin-top: 4px">Reference ID: <strong>${invoiceData.refNo}</strong></div>
                  <div style="font-size: 12px; color: #555; margin-top: 4px">Price: <strong>$${invoiceData.price}</strong></div>
                  <div style="font-size: 12px; color: #555; margin-top: 4px">Invoice #: <strong>${invoiceNumberDisplay}</strong></div>
                  <div style="font-size: 12px; color: #555; margin-top: 4px">Invoice ID: <strong>${invoiceIdDisplay}</strong></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px 24px 24px; text-align: center;">
            <a href="${paypalInvoiceLink}" style="display: inline-block; background: #0070ba; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 16px 0;">
              View & Pay Invoice on PayPal
            </a>
            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
              Or copy this link: <a href="${paypalInvoiceLink}" style="color: #0070ba;">${paypalInvoiceLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px 24px 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px;">
            <p style="margin: 0 0 8px 0;"><strong>What happens next?</strong></p>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              <li>Click the button above to view your invoice on PayPal</li>
              <li>Review the invoice details and payment terms</li>
              <li>Complete your payment using PayPal's secure payment system</li>
              <li>You'll receive a payment confirmation from PayPal</li>
            </ul>
            <p style="margin: 16px 0 0 0;">This is an automated invoice email from Autexline. If you have any questions, please contact our support team.</p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">
              <strong>Note:</strong> If the link doesn't work, please wait a few minutes for PayPal to process the invoice, or contact our support team.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// Admin invoice email template
function renderAdminInvoiceEmail(invoiceData, paypalResult) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #111">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,.05)">
        <tr>
          <td style="padding: 24px 24px 12px 24px">
            <div style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: #2563eb; color: #fff; font-size: 12px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase">ADMIN NOTIFICATION</div>
            <h2 style="margin: 12px 0 4px 0; font-size: 22px">New PayPal Invoice Generated</h2>
            <p style="margin: 0; color: #555">A customer has requested to buy a product and a PayPal invoice has been generated.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px 12px 24px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #fafafa; border: 1px solid #eee; border-radius: 8px">
              <tr>
                <td style="padding: 16px; vertical-align: top">
                  <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px">Product</div>
                  <div style="font-size: 16px; color: #111; font-weight: 700">${invoiceData.productTitle}</div>
                  <div style="font-size: 12px; color: #555; margin-top: 4px">Reference ID: <strong>${invoiceData.refNo}</strong></div>
                  <div style="font-size: 12px; color: #555; margin-top: 4px">Price: <strong>$${invoiceData.price}</strong></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px 24px 24px; color: #6b7280; font-size: 12px">
            This is an automated admin notification email from Autexline. A PayPal invoice has been generated and sent to the customer.
          </td>
        </tr>
      </table>
    </div>
  `;
}

module.exports = paypalController; 