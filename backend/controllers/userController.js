import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import sendEmail from '../utils/email.js';
import crypto from 'crypto';

//get user's profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(StatusCodes.OK).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

//update user's profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const fieldsToUpdate = {};

    if (name) fieldsToUpdate.name = name;
    
     
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: 'Email is already in use',
        });
      }
      
      fieldsToUpdate.email = email;
      fieldsToUpdate.isVerified = false;
      
      const verificationToken = crypto.randomBytes(20).toString('hex');
      fieldsToUpdate.verificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      fieldsToUpdate.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
      
      await sendVerificationEmail(email, verificationUrl);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(StatusCodes.OK).json({
      success: true,
      data: user,
      message: email && email !== req.user.email 
        ? 'Profile updated. Please verify your new email address.' 
        : 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

//update password
export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }
    user.password = req.body.newPassword;
    await user.save();
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Changed',
        message: `Your password was changed on ${new Date().toLocaleString()}. If you didn't make this change, please reset your password immediately.`,
      });
    } catch (error) {
      logger.error(`Password change notification email failed: ${error.message}`);
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

//delete user profile
export const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      await user.deleteOne();  
    }
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Your account has been permanently deleted',
    });
  } catch (error) {
    next(error);
  }
};


export const uploadProfileImage = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: 'No image provided' });
    }
    const sizeInBytes = Math.ceil((image.length * 3) / 4);
    if (sizeInBytes > 200 * 1024) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: 'Image too large (max 200KB)' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: image },
      { new: true, runValidators: true }
    ).select('-password');
    res.status(StatusCodes.OK).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteProfileImage = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: "" },
      { new: true, runValidators: true }
    ).select('-password');
    res.status(StatusCodes.OK).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const sendVerificationEmail = async (email, verificationUrl) => {
  const message = `Please verify your new email by clicking on the link: \n\n ${verificationUrl} \n\n If you did not request this change, please secure your account.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>You have requested to update your email address. Please verify this new email by clicking the button below:</p>
      <div style="margin: 25px 0; text-align: center;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${verificationUrl}</p>
      <p>If you did not make this request, please secure your account immediately.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">This email was sent from Aelyra. Please do not reply to this email.</p>
    </div>
  `;
  
  await sendEmail({
    email,
    subject: 'Verify Your New Email Address',
    message,
    html,
  });
};
