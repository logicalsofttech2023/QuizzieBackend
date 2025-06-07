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
  getUserDetail,
  getAllQuestionsByQuizId,
  addMoneyToWallet,
  getAllQuiz,
} = require("../controller/user_controller");
const { authMiddleware, isAdmin } = require("../middlewares/auth_middleware");


router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/resendOtp", resendOtp);
router.post("/registerUser", registerUser);
router.get("/getUserDetail", authMiddleware, getUserDetail);
router.get("/getAllQuestionsByQuizId", authMiddleware, getAllQuestionsByQuizId);
router.get("/getAllQuiz", authMiddleware, getAllQuiz);


router.post("/submitQuizResult", authMiddleware, submitQuizResult);
router.get("/getAllQuizResults", getAllQuizResults);
router.get("/getQuizResultById", getQuizResultById);
router.get("/getQuizResultsByUserId", authMiddleware, getQuizResultsByUserId);
router.get("/getQuizByStatus", getQuizByStatus);
router.get("/addMoneyToWallet", authMiddleware, addMoneyToWallet);


module.exports = router;
