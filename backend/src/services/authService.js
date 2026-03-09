const jwt = require("jsonwebtoken");
const config = require("../config");
const { User, Worker, Employer } = require("../models");
const { cache } = require("../config/redis");
const { generateOTP } = require("../utils/helpers");
const {
  AuthenticationError,
  ValidationError,
  ConflictError,
  NotFoundError,
} = require("../utils/errors");
const logger = require("../utils/logger");

class AuthService {
  /**
   * Send OTP to phone number
   */
  async sendOTP(phone) {
    let user = await User.findByPhone(phone);

    if (!user) {
      // Create new user with just phone
      user = await User.create({ phone });
      logger.info(`New user created with phone: ${phone}`);
    }

    if (!user.is_active) {
      throw new AuthenticationError("Account is deactivated");
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // In production, send OTP via SMS
    if (process.env.NODE_ENV === "production") {
      await this.sendSMS(phone, `Your HackForge OTP is: ${otp}`);
    } else {
      // In development, log OTP
      logger.info(`OTP for ${phone}: ${otp}`);
    }

    return {
      message: "OTP sent successfully",
      // Only return OTP in development
      ...(process.env.NODE_ENV !== "production" && { otp }),
    };
  }

  /**
   * Verify OTP and login
   */
  async verifyOTP(phone, otp) {
    const user = await User.findByPhone(phone);

    if (!user) {
      throw new NotFoundError("User");
    }

    if (!user.verifyOTP(otp)) {
      throw new AuthenticationError("Invalid or expired OTP");
    }

    // Clear OTP
    user.clearOTP();
    user.is_verified = true;
    user.last_login_at = new Date();

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    // Clear cache
    await cache.del(`user:${user.id}`);

    return {
      user: user.toSafeJSON(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.expiresIn,
      },
      isNewUser: !user.name,
    };
  }

  /**
   * Complete user profile after OTP verification
   */
  async completeProfile(userId, profileData) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError("User");
    }

    // Update user basic info
    if (profileData.name) user.name = profileData.name;
    if (profileData.email) user.email = profileData.email;
    if (profileData.role) user.role = profileData.role;
    if (profileData.language) user.language = profileData.language;

    await user.save();

    // Create role-specific profile
    if (user.role === "worker") {
      await this.createWorkerProfile(user.id, profileData);
    } else if (user.role === "employer") {
      await this.createEmployerProfile(user.id, profileData);
    }

    // Clear cache
    await cache.del(`user:${user.id}`);

    return user.toSafeJSON();
  }

  /**
   * Create worker profile
   */
  async createWorkerProfile(userId, data) {
    const existing = await Worker.findOne({ where: { user_id: userId } });

    if (existing) {
      // Update existing profile
      Object.assign(existing, {
        age: data.age,
        gender: data.gender,
        occupation: data.occupation,
        education: data.education,
        experience_years: data.experience_years,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        location_address: data.location_address,
        city: data.city,
        state: data.state,
        skills: data.skills,
      });
      existing.calculateProfileCompletion();
      await existing.save();
      return existing;
    }

    const worker = await Worker.create({
      user_id: userId,
      age: data.age,
      gender: data.gender,
      occupation: data.occupation,
      education: data.education,
      experience_years: data.experience_years,
      location_lat: data.location_lat,
      location_lng: data.location_lng,
      location_address: data.location_address,
      city: data.city,
      state: data.state,
      skills: data.skills || [],
    });

    worker.calculateProfileCompletion();
    await worker.save();

    return worker;
  }

  /**
   * Create employer profile
   */
  async createEmployerProfile(userId, data) {
    const existing = await Employer.findOne({ where: { user_id: userId } });

    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return existing;
    }

    const employer = await Employer.create({
      user_id: userId,
      company_name: data.company_name,
      company_type: data.company_type,
      company_description: data.company_description,
      industry: data.industry,
      address: data.address,
      city: data.city,
      state: data.state,
      location_lat: data.location_lat,
      location_lng: data.location_lng,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      gst_number: data.gst_number,
    });

    return employer;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new NotFoundError("User");
    }

    if (user.refresh_token !== refreshToken) {
      throw new AuthenticationError("Refresh token has been revoked");
    }

    const tokens = this.generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    return {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: config.jwt.expiresIn,
      },
    };
  }

  /**
   * Logout user
   */
  async logout(userId) {
    const user = await User.findByPk(userId);

    if (user) {
      user.refresh_token = null;
      user.fcm_token = null;
      await user.save();

      // Clear cache
      await cache.del(`user:${userId}`);
      await cache.del(`worker:${userId}`);
      await cache.del(`employer:${userId}`);
    }

    return { message: "Logged out successfully" };
  }

  /**
   * Update FCM token for push notifications
   */
  async updateFCMToken(userId, fcmToken) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError("User");
    }

    user.fcm_token = fcmToken;
    await user.save();

    return { message: "FCM token updated" };
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        phone: user.phone,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Send SMS (placeholder - implement with actual SMS provider)
   */
  async sendSMS(phone, message) {
    // Implementation depends on SMS provider (Twilio, MSG91, etc.)
    logger.info(`Sending SMS to ${phone}: ${message}`);

    if (config.sms.provider === "twilio") {
      // Implement Twilio SMS
      // const client = require('twilio')(config.sms.twilio.accountSid, config.sms.twilio.authToken);
      // await client.messages.create({
      //   body: message,
      //   from: config.sms.twilio.phoneNumber,
      //   to: `+91${phone}`,
      // });
    }

    return true;
  }

  /**
   * Get current user with profile
   */
  async getCurrentUser(userId) {
    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ["password_hash", "otp", "otp_expires_at", "refresh_token"],
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    let profile = null;

    if (user.role === "worker") {
      profile = await Worker.findOne({ where: { user_id: userId } });
    } else if (user.role === "employer") {
      profile = await Employer.findOne({ where: { user_id: userId } });
    }

    return {
      user,
      profile,
    };
  }
}

module.exports = new AuthService();
