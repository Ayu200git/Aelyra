import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import sendEmail from '../utils/email.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      logger.warn('Registration attempt with missing fields');
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Please provide name, email and password',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
    });

    // Generate email verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const verificationUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/verify-email/${verificationToken}`;

    // Send verification email (only if SMTP is configured)
    if (process.env.SMTP_HOST && process.env.SMTP_USERNAME) {
      try {
        const message = `Please verify your email by clicking on the link: \n\n ${verificationUrl} \n\n If you did not request this, please ignore this email.`;

        await sendEmail({
          email: user.email,
          subject: 'Email Verification',
          message,
        });
        logger.info(`Verification email sent to ${user.email}`);
      } catch (emailError) {
        logger.error(`Failed to send verification email: ${emailError.message}`);
        // Don't fail registration if email fails
      }
    } else {
      logger.info(`SMTP not configured. Verification URL: ${verificationUrl}`);
    }

    // Create token
    const token = user.getSignedJwtToken();

    res.status(StatusCodes.CREATED).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: messages.join(', '),
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Email already exists',
      });
    }
    
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Please provide an email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if email is verified (optional: comment out if you want to allow unverified login)
    // if (!user.isVerified) {
    //   return res.status(StatusCodes.FORBIDDEN).json({
    //     success: false,
    //     error: 'Please verify your email before logging in',
    //   });
    // }

    // Create token
    const token = user.getSignedJwtToken();

    // Create secure cookie with token
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    res
      .status(StatusCodes.OK)
      .cookie('token', token, cookieOptions)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'No user found with that email',
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: 'Email sent',
      });
    } catch (err) {
      logger.error(`Send email error: ${err.message}`);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Email could not be sent',
      });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Invalid token or token has expired',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Create token
    const token = user.getSignedJwtToken();

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:verificationtoken
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = crypto
      .createHash('sha256')
      .update(req.params.verificationtoken)
      .digest('hex');

    const user = await User.findOne({
      verificationToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Invalid token or token has expired',
      });
    }

    // Update user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Create token
    const token = user.getSignedJwtToken();

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check authentication status
// @route   GET /api/auth/check
// @access  Private
export const checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        authenticated: false,
        error: 'Not authenticated'
      });
    }

    // Get fresh user data from database
    const user = await User.findById(req.user._id).select('-password -__v');
    
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        authenticated: false,
        error: 'User not found'
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error(`Check auth error: ${error.message}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      authenticated: false,
      error: 'Server error during authentication check'
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'No user found with that email',
      });
    }

    if (user.isVerified) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    // Generate new verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const verificationUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/verify-email/${verificationToken}`;

    // Send verification email
    const message = `Please verify your email by clicking on the link: \n\n ${verificationUrl} \n\n If you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: 'Verification email sent',
      });
    } catch (err) {
      logger.error(`Send email error: ${err.message}`);
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Email could not be sent',
      });
    }
  } catch (err) {
    next(err);
  }
};