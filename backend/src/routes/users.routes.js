import { Router } from "express";
import { 
  sendOtp, 
  verifyOtpAndRegister, 
  loginUser, 
  addToHistory, 
  getUserHistory,
  getUserProfile,  
  verifyToken      
} from "../controllers/user.controllers.js";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndRegister);
router.post("/login", loginUser);
router.get("/profile", getUserProfile);      
router.get("/verify", verifyToken);          
router.get("/get_all_activity", getUserHistory); 
router.post("/add_to_activity", addToHistory);

export default router;