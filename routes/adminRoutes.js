const express = require("express");
const router = express.Router();

const {
  adminSignup,
  loginAdmin,
  getAdminDetail,
  resetAdminPassword,
  updateAdminDetail,
  getAllUsers,
  getSpecificUser,
  deleteSpecificUser,
  updateUserBlockStatus,
  createQuiz,
  getAllQuizInAdmin,
  getSpecificQuiz,
  deleteSpecificQuiz,
  updateQuiz,
  policyUpdate,
  getPolicy,
  addFAQ,
  updateFAQ,
  getAllFAQs,
  getFAQById,
  createQuestion,
  getSpecificQuestion,
  deleteSpecificQuestion,
  updateQuestion,
  getAllQuestionsFromQuizId,
  getAllTransaction,
  getAllPracticeQuizInAdmin,
  updateKycStatus,
  getUserDetailsById,
  getReferralSettings,
  updateReferralBonus,
  getAllReviews,
  getContactUs,
  addOrUpdateContactUs,
  getAllQuizByTypeInAdmin,
  addStreakReward,
  updateStreakReward,
  deleteStreakReward,
  getAllStreakRewards,
  addStreakBadge,
  updateStreakBadge,
  deleteStreakBadge,
  getAllStreakBadges,
  getAllTickets,
  updateTicketStatus,
  createReferralCode,
  updateReferralCode,
  deleteReferralCode,
  getAllReferralCodes,
} = require("../controller/adminController");

const { adminMiddleware } = require("../middlewares/adminMiddleware");
const Quiz = require("../models/quiz_model");
const Question = require("../models/question_model");
const quizData = require("../quizData.json");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin endpoints
 */

/**
 * @swagger
 * /api/admin/adminSignup:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Admin User"
 *               email:
 *                 type: string
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 admin:
 *                   type: object
 *                 token:
 *                   type: string
 */
router.post("/adminSignup", adminSignup);

/**
 * @swagger
 * /api/admin/loginAdmin:
 *   post:
 *     summary: Login as admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Admin logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 admin:
 *                   type: object
 *                 token:
 *                   type: string
 */
router.post("/loginAdmin", loginAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */

/**
 * @swagger
 * /api/admin/getAdminDetail:
 *   get:
 *     summary: Get admin details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get("/getAdminDetail", adminMiddleware, getAdminDetail);

/**
 * @swagger
 * /api/admin/resetAdminPassword:
 *   put:
 *     summary: Reset admin password
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *               confirmPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 */
router.put("/resetAdminPassword", adminMiddleware, resetAdminPassword);

/**
 * @swagger
 * /api/admin/updateAdminDetail:
 *   put:
 *     summary: Update admin details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Admin"
 *               email:
 *                 type: string
 *                 example: "updated@example.com"
 *     responses:
 *       200:
 *         description: Admin details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.put("/updateAdminDetail", adminMiddleware, updateAdminDetail);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Admin endpoints
 */

/**
 * @swagger
 * /api/admin/getAllUsers:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         default: 10
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get("/getAllUsers", adminMiddleware, getAllUsers);

/**
 * @swagger
 * /api/admin/getSpecificUser:
 *   get:
 *     summary: Get specific user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 status:
 *                   type: boolean
 *                 user:
 *                   type: object
 */
router.get("/getSpecificUser", adminMiddleware, getSpecificUser);

/**
 * @swagger
 * /api/admin/deleteSpecificUser:
 *   delete:
 *     summary: Delete a specific user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 */
router.delete("/deleteSpecificUser", adminMiddleware, deleteSpecificUser);

/**
 * @swagger
 * /api/admin/updateUserBlockStatus:
 *   put:
 *     summary: Update user block status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isBlocked
 *               - user_id
 *             properties:
 *               isBlocked:
 *                 type: boolean
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: User block status updated successfully
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
 */
router.put("/updateUserBlockStatus", adminMiddleware, updateUserBlockStatus);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Policy and FAQ management
 */

/**
 * @swagger
 * /api/admin/policyUpdate:
 *   put:
 *     summary: Update policy
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Policy updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 policy:
 *                   type: object
 */
router.post("/policyUpdate", policyUpdate);

/**
 * @swagger
 * /api/admin/getPolicy:
 *   get:
 *     summary: Get policy
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Policy fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 policy:
 *                   type: object
 */
router.get("/getPolicy", adminMiddleware, getPolicy);

/**
 * @swagger
 * /api/admin/addFAQ:
 *   post:
 *     summary: Add new FAQ
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: FAQ added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 faq:
 *                   type: object
 */
router.post("/addFAQ", adminMiddleware, addFAQ);

/**
 * @swagger
 * /api/admin/updateFAQ:
 *   put:
 *     summary: Update FAQ
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 faq:
 *                   type: object
 */
router.put("/updateFAQ", adminMiddleware, updateFAQ);

/**
 * @swagger
 * /api/admin/getAllFAQs:
 *   get:
 *     summary: Get all FAQs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FAQs fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 faqs:
 *                   type: array
 *                   items:
 *                     type: object
 *                 message:
 *                   type: string
 */
router.get("/getAllFAQs", adminMiddleware, getAllFAQs);

/**
 * @swagger
 * /api/admin/getFAQById:
 *   get:
 *     summary: Get FAQ by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: FAQ fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 faq:
 *                   type: object
 *                 message:
 *                   type: string
 */
router.get("/getFAQById", adminMiddleware, getFAQById);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin endpoints
 */

/**
 * @swagger
 * /api/admin/createQuiz:
 *   post:
 *     summary: Create a new quiz
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - prize
 *               - date
 *               - joiningAmount
 *               - type
 *               - startTime
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               prize:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               entries:
 *                 type: integer
 *               joiningAmount:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               startTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quiz created successfully
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
 *                 newQuiz:
 *                   type: object
 */
router.post("/createQuiz", adminMiddleware, createQuiz);

/**
 * @swagger
 * /api/admin/getAllQuizInAdmin:
 *   get:
 *     summary: Get all quizzes
 *     tags: [Admin]
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
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/getAllQuizInAdmin", adminMiddleware, getAllQuizInAdmin);

/**
 * @swagger
 * /api/admin/getSpecificQuiz:
 *   get:
 *     summary: Get specific quiz details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: quiz_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Quiz details fetched successfully
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
 *                 quiz:
 *                   type: object
 */
router.get("/getSpecificQuiz", adminMiddleware, getSpecificQuiz);

/**
 * @swagger
 * /api/admin/deleteSpecificQuiz:
 *   delete:
 *     summary: Delete a specific quiz
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: quiz_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
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
 */
router.delete("/deleteSpecificQuiz", adminMiddleware, deleteSpecificQuiz);

/**
 * @swagger
 * /api/admin/updateQuiz:
 *   put:
 *     summary: Update quiz details
 *     tags: [Admin]
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
 *             properties:
 *               quiz_id:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               prize:
 *                 type: string
 *               date:
 *                 type: string
 *               joiningAmount:
 *                 type: string
 *               type:
 *                 type: string
 *               entries:
 *                 type: integer
 *               status:
 *                 type: string
 *               startTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quiz updated successfully
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
 *                 updatedQuiz:
 *                   type: object
 */
router.put("/updateQuiz", adminMiddleware, updateQuiz);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin endpoints
 */

/**
 * @swagger
 * /api/admin/createQuestion:
 *   post:
 *     summary: Create a new question
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quiz:
 *                 type: string
 *               questionText:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctOptionIndex:
 *                 type: integer
 *               points:
 *                 type: integer
 *               timeLimit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Question created successfully
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
 *                 newQuestion:
 *                   type: object
 */
router.post("/createQuestion", adminMiddleware, createQuestion);

/**
 * @swagger
 * /api/admin/getSpecificQuestion:
 *   get:
 *     summary: Get specific question details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: question_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Question details fetched successfully
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
 *                 question:
 *                   type: object
 */
router.get("/getSpecificQuestion", adminMiddleware, getSpecificQuestion);

/**
 * @swagger
 * /api/admin/deleteSpecificQuestion:
 *   delete:
 *     summary: Delete a specific question
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: question_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Question deleted successfully
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
 */
router.delete(
  "/deleteSpecificQuestion",
  adminMiddleware,
  deleteSpecificQuestion
);

/**
 * @swagger
 * /api/admin/updateQuestion:
 *   put:
 *     summary: Update question details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question_id:
 *                 type: string
 *               quiz:
 *                 type: string
 *               questionText:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctOptionIndex:
 *                 type: integer
 *               points:
 *                 type: integer
 *               timeLimit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Question updated successfully
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
 *                 updatedQuestion:
 *                   type: object
 */
router.put("/updateQuestion", adminMiddleware, updateQuestion);

/**
 * @swagger
 * /api/admin/getAllQuestionsFromQuizId:
 *   get:
 *     summary: Get all questions for a quiz
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: quiz_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Questions fetched successfully
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
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get(
  "/getAllQuestionsFromQuizId",
  adminMiddleware,
  getAllQuestionsFromQuizId
);

/**
 * @swagger
 * /api/admin/getAllTransaction:
 *   get:
 *     summary: Get all transaction history
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 message:
 *                   type: string
 */
router.get("/getAllTransaction", adminMiddleware, getAllTransaction);
router.get("/getAllPracticeQuiz", adminMiddleware, getAllPracticeQuizInAdmin);
router.post("/updateKycStatus", adminMiddleware, updateKycStatus);
router.get("/getUserDetailsById", adminMiddleware, getUserDetailsById);
router.get("/getReferralSettings", adminMiddleware, getReferralSettings);
router.post("/updateReferralBonus", adminMiddleware, updateReferralBonus);
router.get("/getAllReviews", adminMiddleware, getAllReviews);
router.get("/getContactUs", adminMiddleware, getContactUs);
router.post("/addOrUpdateContactUs", adminMiddleware, addOrUpdateContactUs);
router.get("/getAllQuizByTypeInAdmin", getAllQuizByTypeInAdmin);
router.post("/addStreakReward", adminMiddleware, addStreakReward);
router.post("/updateStreakReward", adminMiddleware, updateStreakReward);
router.delete("/deleteStreakReward", adminMiddleware, deleteStreakReward);
router.get("/getAllStreakRewards", adminMiddleware, getAllStreakRewards);

router.post("/addStreakBadge", adminMiddleware, addStreakBadge);
router.post("/updateStreakBadge", adminMiddleware, updateStreakBadge);
router.delete("/deleteStreakBadge", adminMiddleware, deleteStreakBadge);
router.get("/getAllStreakBadges", adminMiddleware, getAllStreakBadges);
router.get("/getAllTickets", adminMiddleware, getAllTickets);
router.post("/updateTicketStatus", adminMiddleware, updateTicketStatus);
router.post("/createReferralCode", adminMiddleware, createReferralCode);
router.post("/updateReferralCode", adminMiddleware, updateReferralCode);
router.post("/deleteReferralCode", adminMiddleware, deleteReferralCode);
router.get("/getAllReferralCodes", adminMiddleware, getAllReferralCodes);

router.post("/seedquizzes", async (req, res) => {
  try {
    // Clear existing data (optional)
    await Quiz.deleteMany({});
    await Question.deleteMany({});

    // Insert new data
    const createdQuizzes = [];

    for (const quiz of quizData.quizzes) {
      // Create quiz without questions first
      const { questions, ...quizData } = quiz;
      const newQuiz = await Quiz.create(quizData);
      createdQuizzes.push(newQuiz);

      // Create questions for this quiz
      const questionPromises = questions.map((question) => {
        return Question.create({
          quiz: newQuiz._id,
          question: question.question,
          options: question.options,
          correctOptionIndex: question.correctOptionIndex,
        });
      });

      await Promise.all(questionPromises);
    }

    res.status(201).json({
      success: true,
      message: "Database seeded successfully",
      data: createdQuizzes,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    res.status(500).json({
      success: false,
      message: "Error seeding database",
      error: error.message,
    });
  }
});

module.exports = router;

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
