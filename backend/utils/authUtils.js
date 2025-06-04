const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const dotenv = require("dotenv")

dotenv.config()

// Generate a random OTP
function generateOTP() {
  // Generate a 6 digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id || user.member_id, // Dynamically handle id for both students and committee members
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "hostel_mess_secret_key_for_jwt_auth",
    { expiresIn: "24h" },
  )
}

// Hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

// Compare password with hashed password
async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Check if OTP has expired
function isOTPExpired(otpExpiry) {
  if (!otpExpiry) return true
  return new Date() > new Date(otpExpiry)
}

module.exports = {
  generateOTP,
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isOTPExpired,
}
