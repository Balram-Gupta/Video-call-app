import { Router } from "express";
import { 
  sendOtp, 
  verifyOtpAndRegister, 
  registerUser,
  loginUser, 
  logoutUser,
  addToHistory, 
  getUserHistory,
  getUserProfile,
  updateUserProfile,
  verifyToken      
} from "../controllers/user.controllers.js";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndRegister);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);
router.get("/verify", verifyToken);          
router.get("/get_all_activity", getUserHistory); 
router.post("/add_to_activity", addToHistory);

export default router;
