import User from "../models/user.js";
import Meeting from "../models/meeting.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";

//  OTP  
const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const RESEND_COOLDOWN = 60 * 1000;

//  Send OTP 
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = otpStore.get(email);

    if (existing && existing.lastSent + RESEND_COOLDOWN > Date.now()) {
      const remaining = Math.ceil(
        (existing.lastSent + RESEND_COOLDOWN - Date.now()) / 1000
      );

      return res.status(429).json({
        message: `Please wait ${remaining}s before requesting another OTP`,
      });
    }

    const otp = generateOTP();

    otpStore.set(email, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000,
      lastSent: Date.now(),
    });

    await sendEmail(email, otp);

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Verify OTP + Register 
export const verifyOtpAndRegister = async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: true,
    });

    otpStore.delete(email);

    res.json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Login 
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name || user.username,
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token not provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name || user.username,
        isGuest: false,
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: error.message });
  }
};

//  Verify Token
export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.json({ valid: false });
  }
};

//  Get History
export const getUserHistory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "Token not provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const meetings = await Meeting.find({
      user_id: decoded.id,
    });

    return res.status(200).json(meetings);

  } catch (error) {
    return res.status(500).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};

//  Add history
export const addToHistory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { meeting_code } = req.body;

    if (!token || !meeting_code) {
      return res.status(400).json({
        message: "Token and meeting code are required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const newMeeting = new Meeting({
      user_id: decoded.id,
      meeting_code: meeting_code, 
    });

    await newMeeting.save();

    return res
      .status(httpStatus.CREATED)
      .json({ message: "Meeting added to history" });

  } catch (error) {
    return res.status(500).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};