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
  getAllTransactionsByUser,
  getAllNotificationsByUser,
  updateUser,
  joinQuiz,
  getTodayQuiz,
  addKycDetails,
  updateKycDetails,
  getMyKyc,
  getUserReferralCode,
  getMyNotification,
  getUserStats,
  addReview,
  getUserTransaction,
  getStreak,
  addBankDetails,
  updateBankDetails,
  getMyBankDetails,
} = require("../controller/user_controller");
const { authMiddleware } = require("../middlewares/auth_middleware");
const { getPolicy, getAllFAQs } = require("../controller/adminController");
const upload = require("../middlewares/uploadMiddleware");

const kycUploads = upload.fields([
    { name: "aadharFrontImg", maxCount: 1 },
    { name: "aadharBackImg", maxCount: 1 },
    { name: "panFrontImg", maxCount: 1 },
    { name: "panBackImg", maxCount: 1 }
]);

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/user/generateOtp:
 *   post:
 *     summary: Generate OTP for mobile verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 otp:
 *                   type: string
 */
router.post("/generateOtp", generateOtp);

/**
 * @swagger
 * /api/user/verifyOtp:
 *   post:
 *     summary: Verify OTP for mobile verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *               - otp
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 isRegistered:
 *                   type: boolean
 *                 token:
 *                   type: string
 */
router.post("/verifyOtp", verifyOtp);

/**
 * @swagger
 * /api/user/resendOtp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 otp:
 *                   type: string
 */
router.post("/resendOtp", resendOtp);

/**
 * @swagger
 * /api/user/registerUser:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - userEmail
 *               - mobile
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "John"
 *               lastname:
 *                 type: string
 *                 example: "Doe"
 *               userEmail:
 *                 type: string
 *                 example: "john.doe@example.com"
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 result:
 *                   type: object
 */
router.post("/registerUser", upload.single("profilePic"), registerUser);

/**
 * @swagger
 * /api/user/getUserDetail:
 *   get:
 *     summary: Get user details
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 stats:
 *                   type: object
 */
router.get("/getUserDetail", authMiddleware, getUserDetail);

/**
 * @swagger
 * /api/user/updateUser:
 *   post:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "John"
 *               lastname:
 *                 type: string
 *                 example: "Doe"
 *               userEmail:
 *                 type: string
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updatedUser:
 *                   type: object
 */
router.post("/updateUser", authMiddleware, upload.single("profilePic"), updateUser);

/**
 * @swagger
 * /api/user/getAllQuestionsByQuizId:
 *   get:
 *     summary: Get all questions for a quiz
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: quiz_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The quiz ID
 *     responses:
 *       200:
 *         description: Quiz questions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 canJoin:
 *                   type: boolean
 *                 quiz:
 *                   type: object
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getAllQuestionsByQuizId", authMiddleware, getAllQuestionsByQuizId);

/**
 * @swagger
 * /api/user/getAllQuiz:
 *   get:
 *     summary: Get all quizzes
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quizzes fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 completed:
 *                   type: array
 *                   items:
 *                     type: object
 *                 upcoming:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getAllQuiz", authMiddleware, getAllQuiz);

/**
 * @swagger
 * /api/user/submitQuizResult:
 *   post:
 *     summary: Submit quiz results
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quiz_id
 *               - answers
 *             properties:
 *               quiz_id:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     selectedOptionIndex:
 *                       type: number
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 */
router.post("/submitQuizResult", authMiddleware, submitQuizResult);

/**
 * @swagger
 * /api/user/getAllQuizResults:
 *   get:
 *     summary: Get all quiz results
 *     tags: [Quiz]
 *     responses:
 *       200:
 *         description: Quiz results fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getAllQuizResults", getAllQuizResults);

/**
 * @swagger
 * /api/user/getQuizResultById:
 *   get:
 *     summary: Get quiz result by ID
 *     tags: [Quiz]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The quiz result ID
 *     responses:
 *       200:
 *         description: Quiz result fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 result:
 *                   type: object
 */
router.get("/getQuizResultById", getQuizResultById);

/**
 * @swagger
 * /api/user/getQuizResultsByUserId:
 *   get:
 *     summary: Get quiz results by user ID
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quiz results fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getQuizResultsByUserId", authMiddleware, getQuizResultsByUserId);

/**
 * @swagger
 * /api/user/getQuizByStatus:
 *   get:
 *     summary: Get quizzes by status
 *     tags: [Quiz]
 *     parameters:
 *       - in: query
 *         name: quiz_id
 *         schema:
 *           type: string
 *         description: The quiz ID
 *     responses:
 *       200:
 *         description: Quizzes fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getQuizByStatus", getQuizByStatus);

/**
 * @swagger
 * /api/user/addMoneyToWallet:
 *   get:
 *     summary: Add money to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         required: true
 *         description: Amount to add
 *     responses:
 *       200:
 *         description: Money added to wallet successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 walletBalance:
 *                   type: number
 *                 transaction:
 *                   type: object
 */
router.get("/addMoneyToWallet", authMiddleware, addMoneyToWallet);

/**
 * @swagger
 * /api/user/getPolicy:
 *   get:
 *     summary: Get policy by type
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: Type of the policy to fetch
 *     responses:
 *       200:
 *         description: Policy fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Policy fetched successfully
 *                 policy:
 *                   $ref: '#/components/schemas/Policy'
 *       400:
 *         description: Missing or invalid policy type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Policy type is required
 *       404:
 *         description: Policy not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Policy not found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 *                 error:
 *                   type: string
 */
router.get("/getPolicy", getPolicy);

/**
 * @swagger
 * /api/user/getAllFAQs:
 *   get:
 *     summary: Get all FAQs
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FAQs fetched successfully
 */
router.get("/getAllFAQs", authMiddleware, getAllFAQs);

/**
 * @swagger
 * /api/user/getAllTransactionsByUser:
 *   get:
 *     summary: Get all transactions by user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getAllTransactionsByUser", authMiddleware, getAllTransactionsByUser);

/**
 * @swagger
 * /api/user/getAllNotificationsByUser:
 *   get:
 *     summary: Get all notifications by user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getAllNotificationsByUser", authMiddleware, getAllNotificationsByUser);


router.post("/joinQuiz", authMiddleware, joinQuiz);
router.get("/getTodayQuiz", authMiddleware, getTodayQuiz);
router.post("/addKycDetails", authMiddleware, kycUploads,  addKycDetails);
router.get("/getMyKyc", authMiddleware, getMyKyc);
router.post("/updateKycDetails", authMiddleware, kycUploads, updateKycDetails);
router.get("/getUserReferralCode", authMiddleware, getUserReferralCode);
router.get("/getMyNotification", authMiddleware, getMyNotification);
router.get("/getUserStats", authMiddleware, getUserStats);
router.post("/addReview", authMiddleware, addReview);
router.get("/getUserTransaction", authMiddleware, getUserTransaction);
router.get("/getUserStreak", authMiddleware, getStreak);
router.post("/addBankDetails", authMiddleware, addBankDetails);
router.post("/updateBankDetails", authMiddleware, updateBankDetails);
router.get("/getMyBankDetails", authMiddleware, getMyBankDetails);

module.exports = router;