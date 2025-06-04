const express = require("express")
const router = express.Router()
const studentController = require("../controllers/studentController")
const { protect, restrictTo } = require("../middleware/auth")

// Apply middleware to all routes
router.use(protect)
router.use(restrictTo("student"))

// Get daily menu
router.get("/menu", studentController.getMenu)

// Get notices
router.get("/notices", studentController.getNotices)

// Submit feedback
router.post("/feedback", studentController.submitFeedback)

// Apply for mess rebate
router.post("/rebate/apply", studentController.applyRebate)

// Get my rebate applications
router.get("/rebate/my", studentController.getMyRebates)

// Mess Timings Route (Restricted to Students)
router.get("/mess-timings/:day", studentController.getMessTimings)

module.exports = router
