const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { protect } = require("../middleware/auth")

// Register a new user
router.post("/register", authController.register)

//opens the register page
router.get("/register", (req, res) => {
  res.render("register") // This renders the register.ejs template
})

// Verify OTP
router.post("/verify-otp", authController.verifyOTP)

// Render Verify OTP Page for register
router.get("/verify-otp-register", (req, res) => {
  res.render("verifyOtpregister") // Make sure 'verifyOtp.ejs' exists in the views folder
})

// Render Verify OTP Page for login
router.get("/verify-otp-login", (req, res) => {
  res.render("verifyOtplogin") // Make sure 'verifyOtp.ejs' exists in the views folder
})

// Resend OTP
router.post("/resend-otp", authController.resendOTP)

// Login
router.post("/login", authController.login)

//opens the register page
router.get("/login", (req, res) => {
  res.render("login") // This renders the register.ejs template
})

// Get current user profile (protected route)
router.get("/me", protect, authController.getCurrentUser)

router.get("/studentdashboard/data", protect, (req, res) => {
  //console.log('User from middleware:', req.user); // Debug the user object
  res.json({
    user: req.user, // Return the user object passed from the middleware
  })
})

router.get("/studentdashboard", (req, res) => {
  res.render("studentdashboard") // Render the dashboard page
})

router.get("/studentprofile", (req, res) => {
  // Render the student profile page
  res.render("studentProfile") // This assumes your studentProfile.ejs is in the views folder
})

// Render Committee Dashboard
router.get("/committeedashboard", (req, res) => {
  try {
    res.render("committeedashboard", {
      title: "Committee Dashboard", // Page title
    })
  } catch (error) {
    console.error("Error rendering committee dashboard:", error)
    res.status(500).send("Server error while loading the dashboard.")
  }
})

router.get("/committeedashboard/data", protect, async (req, res) => {
  try {
    const { name, email } = req.user // Ensure user data includes name and email
    res.status(200).json({ user: { name, email } })
  } catch (error) {
    console.error("Error fetching committee member data:", error)
    res.status(500).json({ message: "Server error while fetching data" })
  }
})

// Render Committee Profile
router.get("/committeeprofile", async (req, res) => {
  try {
    res.render("committeeprofile", {
      title: "Committee Profile", // Title for the page
    })
  } catch (error) {
    console.error("Error rendering committee profile:", error)
    res.status(500).send("Server error while loading the profile.")
  }
})

router.get("/logout", protect, authController.logoutUser)

module.exports = router
