const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")

dotenv.config()

// Middleware to protect routes
const protect = (req, res, next) => {
  let token

  // Check if token exists in the header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "hostel_mess_secret_key_for_jwt_auth")

      // Add user from payload
      req.user = decoded

      next()
    } catch (error) {
      console.error("JWT verification error:", error)
      res.status(401).json({ message: "Not authorized, token failed" })
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" })
  }
}

// Middleware to restrict access based on role
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, no user" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `You do not have permission to perform this action. Role '${req.user.role}' is not allowed.`,
      })
    }

    next()
  }
}

// Middleware to check if user is verified
const isVerified = (req, res, next) => {
  if (!req.user.verified) {
    return res.status(403).json({
      message: "You need to verify your email before accessing this resource",
    })
  }
  next()
}

module.exports = { protect, restrictTo, isVerified }
