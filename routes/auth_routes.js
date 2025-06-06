const express = require("express");
const router = express.Router();
const {
  generateOtp,
  verifyOtp,
  resendOtp,
  registerUser,
  submitQuizResult,
  getAllQuizResults,
  getQuizResultById,
  getQuizByStatus,
  getQuizResultsByUserId,
} = require("../controller/user_controller");
const { authMiddleware, isAdmin } = require("../middlewares/auth_middleware");


router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/resendOtp", resendOtp);
router.post("/registerUser", registerUser);

router.post("/submitQuizResult", authMiddleware, submitQuizResult);
router.get("/getAllQuizResults", getAllQuizResults);
router.get("/getQuizResultById", getQuizResultById);
router.get("/getQuizResultsByUserId", authMiddleware, getQuizResultsByUserId);
router.get("/getQuizByStatus", getQuizByStatus);

module.exports = router;
