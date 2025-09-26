const CareerApplication = require('../models/CareerApplication');
const { uploadImage } = require('../utils/cloudinary');
const { sendMail } = require('../utils/mailer');

// Submit career application
const submitApplication = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, positionApplyingFor, coverLetter } = req.body;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resume file is required' 
      });
    }

    // Upload resume to Cloudinary
    const uploadResult = await uploadImage(req.file.buffer, {
      folder: 'autoshop/career-applications',
      resource_type: 'raw' // For PDF/DOC files
    });

    // Create career application
    const application = new CareerApplication({
      firstName,
      lastName,
      email,
      phoneNumber,
      positionApplyingFor,
      resumeUrl: uploadResult.secure_url,
      resumePublicId: uploadResult.public_id,
      coverLetter: coverLetter || ''
    });

    await application.save();

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (adminEmail) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Career Application Received</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Application Details</h3>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phoneNumber}</p>
            <p><strong>Position:</strong> ${positionApplyingFor}</p>
            <p><strong>Applied At:</strong> ${new Date().toLocaleString()}</p>
          </div>

          ${coverLetter ? `
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Cover Letter</h3>
            <p style="white-space: pre-wrap;">${coverLetter}</p>
          </div>
          ` : ''}

          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Resume</h3>
            <p>Resume has been uploaded and can be accessed at:</p>
            <a href="${uploadResult.secure_url}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
              Download Resume
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This application was submitted through the Autexline career portal.
            </p>
          </div>
        </div>
      `;

      await sendMail({
        to: adminEmail,
        subject: `New Career Application - ${positionApplyingFor}`,
        html: emailHtml
      });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We will contact you soon.',
      applicationId: application._id
    });

  } catch (error) {
    console.error('Error submitting career application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again.'
    });
  }
};

// Get all career applications (admin only)
const getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = status ? { status } : {};
    const skip = (page - 1) * limit;

    const applications = await CareerApplication.find(query)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await CareerApplication.countDocuments(query);

    res.json({
      success: true,
      applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalApplications: total
      }
    });
  } catch (error) {
    console.error('Error fetching career applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
};

// Get single application (admin only)
const getApplicationById = async (req, res) => {
  try {
    const application = await CareerApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Error fetching career application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application'
    });
  }
};

// Update application status (admin only)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const application = await CareerApplication.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status'
    });
  }
};

// Delete application (admin only)
const deleteApplication = async (req, res) => {
  try {
    const application = await CareerApplication.findByIdAndDelete(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting career application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application'
    });
  }
};

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication
};
