const Inquiry = require('../models/Inquiry');
const { sendMail } = require('../utils/mailer');

const renderEmail = (inquiry) => {
  const {
    name, email, phone, subject, message,
    productTitle, productId, productCategory, productImage,
    actionType, refNo
  } = inquiry;
  const badge = actionType === 'buy_now' ? '#16a34a' : '#f97316';
  const actionLabel = actionType === 'buy_now' ? 'Buy Now Request' : 'Price Quote Request';
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f5f7fb;padding:24px;color:#111">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <tr>
        <td style="padding:24px 24px 12px 24px">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${badge};color:#fff;font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase">${actionLabel}</div>
          <h2 style="margin:12px 0 4px 0;font-size:22px">New customer request received</h2>
          <p style="margin:0;color:#555">A customer submitted the form on a product page. Details below.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 12px 24px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border:1px solid #eee;border-radius:8px">
            <tr>
              <td style="padding:16px;vertical-align:top">
                <div style="font-size:14px;color:#6b7280;margin-bottom:6px">Product</div>
                <div style="font-size:16px;color:#111;font-weight:700">${productTitle || 'Product'}</div>
                ${refNo ? `<div style=\"font-size:12px;color:#555;margin-top:4px\">Reference ID: <strong>${refNo}</strong></div>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 24px">
          <h3 style="margin:0 0 8px 0;font-size:16px">Customer Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px;color:#222">
            <tr><td style="padding:4px 0;width:140px;color:#555">Name</td><td style="padding:4px 0">${name}</td></tr>
            <tr><td style="padding:4px 0;width:140px;color:#555">Email</td><td style="padding:4px 0">${email}</td></tr>
            <tr><td style="padding:4px 0;width:140px;color:#555">Phone</td><td style="padding:4px 0">${phone}</td></tr>
            <tr><td style="padding:4px 0;width:140px;color:#555">Subject</td><td style="padding:4px 0">${subject}</td></tr>
          </table>
          ${message ? `<div style="margin-top:12px;padding:12px;border:1px dashed #e5e7eb;border-radius:8px;background:#fcfcfc"><div style="font-weight:600;margin-bottom:6px">Message</div><div style="white-space:pre-line;color:#444">${message}</div></div>` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px 24px;color:#6b7280;font-size:12px">
          This email was sent automatically by Autexline when a customer clicked "${actionLabel}" on the product page.
        </td>
      </tr>
    </table>
  </div>`;
};

const inquiryController = {
  getAllInquiries: async (req, res) => {
    try {
      const inquiries = await Inquiry.find();
      res.json(inquiries);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  getInquiryById: async (req, res) => {
    try {
      const inquiry = await Inquiry.findById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: 'Inquiry not found' });
      }
      res.json(inquiry);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  createInquiry: async (req, res) => {
    try {
      const payload = req.body || {};
      const inquiry = await Inquiry.create(payload);

      try {
        const adminTo = process.env.NOTIFY_EMAIL_TO || process.env.EMAIL_USER;
        const html = renderEmail({
          ...payload,
          productTitle: payload.product?.title || payload.productTitle,
          refNo: payload.product?.refNo || payload.refNo,
          actionType: payload.actionType || 'price_quote'
        });
        await sendMail({ to: adminTo, subject: `${payload.subject || 'New inquiry'}`, html });
      } catch (mailErr) {
        // eslint-disable-next-line no-console
        console.error('Email send error:', mailErr?.message || mailErr);
      }

      res.status(201).json(inquiry);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  updateInquiry: async (req, res) => {
    try {
      const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!inquiry) {
        return res.status(404).json({ message: 'Inquiry not found' });
      }
      res.json(inquiry);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = inquiryController; 