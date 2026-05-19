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

const signUserToken = (user) => jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

//  Send OTP 
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const existing = otpStore.get(normalizedEmail);

    if (existing && existing.lastSent + RESEND_COOLDOWN > Date.now()) {
      const remaining = Math.ceil(
        (existing.lastSent + RESEND_COOLDOWN - Date.now()) / 1000
      );

      return res.status(429).json({
        message: `Please wait ${remaining}s before requesting another OTP`,
      });
    }

    const otp = generateOTP();

    await sendEmail(normalizedEmail, otp);

    otpStore.set(normalizedEmail, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000,
      lastSent: Date.now(),
    });

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Send OTP error:", err);
    const isConfigError = err.message?.startsWith("Email credentials are missing");
    res.status(500).json({
      message: isConfigError
        ? err.message
        : "Failed to send OTP email. Please check the backend email provider credentials.",
    });
  }
};

//  Verify OTP + Register 
export const verifyOtpAndRegister = async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: true,
    });

    otpStore.delete(normalizedEmail);

    res.json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register directly for clients that do not use the OTP flow.
export const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = signUserToken(user);

    res.status(httpStatus.CREATED).json({
      message: "User registered successfully",
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

    const token = signUserToken(user);

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

export const logoutUser = async (req, res) => {
  res.json({ message: "Logout successful" });
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

export const updateUserProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token not provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, username } = req.body;
    const updates = {};

    if (typeof name === "string") updates.name = name.trim();
    if (typeof username === "string") updates.username = username.trim();

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

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
      },
    });
  } catch (error) {
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

    await Meeting.findOneAndUpdate(
      { user_id: decoded.id, meeting_code },
      { $setOnInsert: { user_id: decoded.id, meeting_code } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res
      .status(httpStatus.CREATED)
      .json({ message: "Meeting added to history" });

  } catch (error) {
    return res.status(500).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};
