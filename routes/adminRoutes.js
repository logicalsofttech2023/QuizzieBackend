const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth_middleware");

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
} = require("../controller/adminController");

const {
  createQuestion,
  getSpecificQuestion,
  deleteSpecificQuestion,
  updateQuestion,
  getAllQuestionsFromQuizId,
} = require("../controller/question_controller");
const { adminMiddleware } = require("../middlewares/adminMiddleware");

router.post("/adminSignup", adminSignup);
router.post("/loginAdmin", loginAdmin);
router.get("/getAdminDetail", adminMiddleware, getAdminDetail);
router.put("/resetAdminPassword", adminMiddleware, resetAdminPassword);
router.put("/updateAdminDetail", adminMiddleware, updateAdminDetail);
router.get("/getAllUsers", adminMiddleware, getAllUsers);
router.get("/getSpecificUser", adminMiddleware, getSpecificUser);
router.delete("/deleteSpecificUser", adminMiddleware, deleteSpecificUser);
router.put("/updateUserBlockStatus", adminMiddleware, updateUserBlockStatus);

router.put("/policyUpdate", adminMiddleware, policyUpdate);
router.get("/getPolicy", adminMiddleware, getPolicy);
router.post("/addFAQ", adminMiddleware, addFAQ);
router.put("/updateFAQ", adminMiddleware, updateFAQ);
router.get("/getAllFAQs", adminMiddleware, getAllFAQs);
router.get("/getFAQById", adminMiddleware, getFAQById);

router.post("/createQuiz", adminMiddleware, createQuiz);
router.get("/getAllQuizInAdmin", adminMiddleware, getAllQuizInAdmin);
router.get("/getSpecificQuiz", adminMiddleware, getSpecificQuiz);
router.delete("/deleteSpecificQuiz", adminMiddleware, deleteSpecificQuiz);
router.put("/updateQuiz", adminMiddleware, updateQuiz);

router.post("/createQuestion", adminMiddleware, createQuestion);
router.get("/getSpecificQuestion", adminMiddleware, getSpecificQuestion);
router.delete(
  "/deleteSpecificQuestion",
  adminMiddleware,
  deleteSpecificQuestion
);
router.put("/updateQuestion", adminMiddleware, updateQuestion);
router.get(
  "/getAllQuestionsFromQuizId",
  adminMiddleware,
  getAllQuestionsFromQuizId
);

module.exports = router;
