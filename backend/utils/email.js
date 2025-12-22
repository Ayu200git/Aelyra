// backend/utils/email.js
import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify connection configuration (only if SMTP is configured)
if (process.env.SMTP_HOST && process.env.SMTP_USERNAME) {
  transporter.verify((error) => {
    if (error) {
      logger.error(`SMTP connection error: ${error.message}`);
      logger.warn('Email functionality will not work until SMTP is properly configured');
    } else {
      logger.info('SMTP server is ready to send emails');
    }
  });
} else {
  logger.warn('SMTP not configured - email functionality disabled');
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (plain text)
 * @param {string} [options.html] - HTML version of the message (optional)
 * @returns {Promise<void>}
 */
const sendEmail = async ({ email, subject, message, html }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USERNAME) {
    logger.warn(`Email skipped (SMTP not configured). Intended recipient: ${email}`);
    return;
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Aelyra'}" <${
      process.env.EMAIL_FROM || process.env.SMTP_USERNAME
    }>`,
    to: email,
    subject,
    text: message,
    ...(html && { html }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${email}`);
  } catch (error) {
    logger.error(`Error sending email to ${email}: ${error.message}`);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetUrl - Password reset URL
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (email, resetUrl) => {
  const message = `You are receiving this email because you (or someone else) has requested the reset of a password.
Please make a PUT request to:

${resetUrl}

If you did not request this, please ignore this email and your password will remain unchanged.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
      <p>Please click the button below to reset your password:</p>
      <div style="margin: 25px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">This email was sent from Aelyra. Please do not reply to this email.</p>
    </div>
  `;

  await sendEmail({
    email,
    subject: 'Your password reset token (valid for 10 minutes)',
    message,
    html,
  });
};

/**
 * Send verification email
 * @param {string} email - Recipient email address
 * @param {string} verificationUrl - Email verification URL
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async (email, verificationUrl) => {
  const message = `Please verify your email by clicking on the link:

${verificationUrl}

If you did not create an account, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Thank you for signing up for Aelyra! Please verify your email address by clicking the button below:</p>
      <div style="margin: 25px 0; text-align: center;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${verificationUrl}</p>
      <p>If you did not create an account, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">This email was sent from Aelyra. Please do not reply to this email.</p>
    </div>
  `;

  await sendEmail({
    email,
    subject: 'Please verify your email',
    message,
    html,
  });
};

export default sendEmail;
