const pool = require("../db")
const {
  generateOTP,
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isOTPExpired,
} = require("../utils/authUtils")
const { sendOTPEmail } = require("../utils/emailService")

// Register a new student
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone_no, hostel_name, room_no } = req.body

    // Validate input
    if (!name || !email || !password || !phone_no || !hostel_name || !room_no) {
      return res.status(400).json({ message: "Please provide all required fields" })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" })
    }

    // Check if user already exists
    const [existingUsers] = await pool.query("SELECT * FROM Users WHERE email = ?", [email])

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User already exists with this email" })
    }

    // Generate OTP
    const otp = generateOTP()

    // Calculate OTP expiry (10 minutes from now)
    const now = new Date()
    const otpExpiry = new Date(now.getTime() + (Number.parseInt(process.env.OTP_EXPIRY) || 10) * 60000)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Default role is student
    const role = "student"

    // Insert new student
    const [result] = await pool.query(
      `INSERT INTO Users (name, email, password, role, phone_no, hostel_name, room_no, otp_code, otp_expiry, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, phone_no, hostel_name, room_no, otp, otpExpiry, false],
    )

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp)

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" })
    }

    res.status(201).json({
      message: "Student registered successfully. Please verify your email with the OTP sent.",
      userId: result.insertId,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error during registration" })
  }
}

// // Verify OTP - 1
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     // Validate input
//     if (!email || !otp) {
//       return res.status(400).json({ message: 'Please provide email and OTP' });
//     }

//     // Get user by email
//     const [users] = await pool.query(
//       'SELECT * FROM Users WHERE email = ?',
//       [email]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const user = users[0];

//     // Check if user is already verified
//     if (user.verified) {
//       return res.status(400).json({ message: 'User is already verified' });
//     }

//     // Check if OTP is valid
//     if (user.otp_code !== otp) {
//       return res.status(400).json({ message: 'Invalid OTP' });
//     }

//     // Check if OTP has expired
//     if (isOTPExpired(user.otp_expiry)) {
//       return res.status(400).json({ message: 'OTP has expired' });
//     }

//     // Update user as verified
//     await pool.query(
//       'UPDATE Users SET verified = true, otp_code = NULL, otp_expiry = NULL WHERE id = ?',
//       [user.id]
//     );

//     // Generate JWT token
//     const token = generateToken(user);

//     res.status(200).json({
//       message: 'Email verified successfully',
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error('OTP verification error:', error);
//     res.status(500).json({ message: 'Server error during OTP verification' });
//   }
// };

//verify-otp2
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, role } = req.body

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and OTP" })
    }

    // Default to "student" role if not provided (for registration context)
    const userRole = role || "student"

    let users

    // Fetch user based on role
    if (userRole === "student") {
      ;[users] = await pool.query("SELECT * FROM Users WHERE email = ?", [email])
    } else if (userRole === "committee") {
      ;[users] = await pool.query("SELECT * FROM MessCommitteeMembers WHERE email = ?", [email])
    } else {
      return res.status(400).json({ message: "Invalid role provided" })
    }

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = users[0]

    // Check if user is already verified
    if (user.verified) {
      return res.status(400).json({ message: "User is already verified" })
    }

    // Check if OTP is valid
    if (user.otp_code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    // Check if OTP has expired
    if (isOTPExpired(user.otp_expiry)) {
      return res.status(400).json({ message: "OTP has expired" })
    }

    // Update user as verified
    if (userRole === "student") {
      await pool.query("UPDATE Users SET verified = true, otp_code = NULL, otp_expiry = NULL WHERE id = ?", [user.id])
    } else if (userRole === "committee") {
      await pool.query(
        "UPDATE MessCommitteeMembers SET verified = true, otp_code = NULL, otp_expiry = NULL WHERE member_id = ?",
        [user.member_id],
      )
    }

    // Generate JWT token
    const token = generateToken(user)

    res.status(200).json({
      message: "Email verified successfully.You are logged in.",
      token,
      user: {
        id: userRole === "student" ? user.id : user.member_id, // Use appropriate ID based on role
        name: user.name,
        email: user.email,
        role: userRole,
      },
    })
  } catch (error) {
    console.error("OTP verification error:", error)
    res.status(500).json({ message: "Server error during OTP verification" })
  }
}

// // Resend OTP
// exports.resendOTP = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Validate input
//     if (!email) {
//       return res.status(400).json({ message: 'Please provide email' });
//     }

//     // Get user by email
//     const [users] = await pool.query(
//       'SELECT * FROM Users WHERE email = ?',
//       [email]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const user = users[0];

//     // Check if user is already verified
//     if (user.verified) {
//       return res.status(400).json({ message: 'User is already verified' });
//     }

//     // Generate new OTP
//     const otp = generateOTP();

//     // Calculate OTP expiry (10 minutes from now)
//     const now = new Date();
//     const otpExpiry = new Date(now.getTime() + (parseInt(process.env.OTP_EXPIRY) || 10) * 60000);

//     // Update user with new OTP
//     await pool.query(
//       'UPDATE Users SET otp_code = ?, otp_expiry = ? WHERE id = ?',
//       [otp, otpExpiry, user.id]
//     );

//     // Send OTP via email
//     const emailSent = await sendOTPEmail(email, otp);

//     if (!emailSent) {
//       return res.status(500).json({ message: 'Failed to send OTP email' });
//     }

//     res.status(200).json({
//       message: 'OTP resent successfully'
//     });
//   } catch (error) {
//     console.error('OTP resend error:', error);
//     res.status(500).json({ message: 'Server error during OTP resend' });
//   }
// };

//resend otp 2
exports.resendOTP = async (req, res) => {
  try {
    const { email, role } = req.body

    // Validate input
    if (!email) {
      return res.status(400).json({ message: "Please provide email" })
    }

    // Assume default role as "student" if no role is provided
    const userRole = role || "student"

    let users

    // Get user by email based on role
    if (userRole === "student") {
      ;[users] = await pool.query("SELECT * FROM Users WHERE email = ?", [email])
    } else if (userRole === "committee") {
      ;[users] = await pool.query("SELECT * FROM MessCommitteeMembers WHERE email = ?", [email])
    } else {
      return res.status(400).json({ message: "Invalid role provided" })
    }

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = users[0]

    // Check if user is already verified
    if (user.verified) {
      return res.status(400).json({ message: "User is already verified" })
    }

    // Generate new OTP
    const otp = generateOTP()

    // Calculate OTP expiry (10 minutes from now)
    const now = new Date()
    const otpExpiry = new Date(now.getTime() + (Number.parseInt(process.env.OTP_EXPIRY) || 10) * 60000)

    // Update user with new OTP and expiry based on role
    if (userRole === "student") {
      await pool.query("UPDATE Users SET otp_code = ?, otp_expiry = ? WHERE id = ?", [otp, otpExpiry, user.id])
    } else if (userRole === "committee") {
      await pool.query("UPDATE MessCommitteeMembers SET otp_code = ?, otp_expiry = ? WHERE member_id = ?", [
        otp,
        otpExpiry,
        user.member_id,
      ])
    }

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp)

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" })
    }

    res.status(200).json({
      message: "OTP resent successfully",
    })
  } catch (error) {
    console.error("OTP resend error:", error)
    res.status(500).json({ message: "Server error during OTP resend" })
  }
}

// // Login user- 1
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Validate input
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Please provide email and password' });
//     }

//     // Get user by email
//     const [users] = await pool.query(
//       'SELECT * FROM Users WHERE email = ?',
//       [email]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const user = users[0];

//     // Check if password matches
//     const isMatch = await comparePassword(password, user.password);

//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Check if user is verified
//     if (!user.verified) {
//       return res.status(401).json({ message: 'Please verify your email before logging in' });
//     }

//     // Generate JWT token
//     const token = generateToken(user);

//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error during login' });
//   }
// };

//login-user 2
exports.login = async (req, res) => {
  try {
    const { email, password, role, member_id } = req.body

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Please provide email, password, and role" })
    }

    if (role === "committee" && !member_id) {
      return res.status(400).json({ message: "Please provide member ID for committee member login" })
    }

    let users

    // Get user based on role
    if (role === "student") {
      ;[users] = await pool.query("SELECT * FROM Users WHERE email = ?", [email])
    } else if (role === "committee") {
      ;[users] = await pool.query("SELECT * FROM MessCommitteeMembers WHERE email = ? AND member_id = ?", [
        email,
        member_id,
      ])
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const user = users[0]

    // Verify password
    let isMatch = false

    if (role === "student") {
      // Compare hashed password for students
      isMatch = await comparePassword(password, user.password)
    } else if (role === "committee") {
      // Directly match plaintext password for committee members
      isMatch = password === user.password
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Set verified to false for every login
    if (role === "student") {
      await pool.query("UPDATE Users SET verified = false WHERE id = ?", [user.id])
    } else if (role === "committee") {
      await pool.query("UPDATE MessCommitteeMembers SET verified = false WHERE member_id = ?", [user.member_id])
    }

    // Generate OTP
    const otp = generateOTP()

    // Calculate OTP expiry (10 minutes from now)
    const now = new Date()
    const otpExpiry = new Date(now.getTime() + (Number.parseInt(process.env.OTP_EXPIRY) || 10) * 60000)

    // Update database with OTP and expiry
    if (role === "student") {
      await pool.query("UPDATE Users SET otp_code = ?, otp_expiry = ? WHERE id = ?", [otp, otpExpiry, user.id])
    } else if (role === "committee") {
      await pool.query("UPDATE MessCommitteeMembers SET otp_code = ?, otp_expiry = ? WHERE member_id = ?", [
        otp,
        otpExpiry,
        user.member_id,
      ])
    }

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp)

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" })
    }

    res.status(401).json({
      message: "An OTP has been sent to your email-id. Please verify your email to proceed.",
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
}

// // Get current user - 1
// exports.getCurrentUser = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Get user data
//     const [users] = await pool.query(
//       'SELECT id, name, email, role, verified FROM Users WHERE id = ?',
//       [userId]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.status(200).json({
//       user: users[0]
//     });
//   } catch (error) {
//     console.error('Get current user error:', error);
//     res.status(500).json({ message: 'Server error while getting user data' });
//   }
// };

//get current user-2
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id // User ID from the request
    const userRole = req.user.role // Role from the request (student or committee)

    let users

    // Get user data based on role
    if (userRole === "student") {
      ;[users] = await pool.query(
        "SELECT id, name, email, role, phone_no, hostel_name, room_no, verified FROM Users WHERE id = ?",
        [userId],
      )
    } else if (userRole === "committee") {
      ;[users] = await pool.query(
        "SELECT member_id AS id, name, email, role,phone_no, designation, verified FROM MessCommitteeMembers WHERE member_id = ?",
        [userId],
      )
    } else {
      return res.status(400).json({ message: "Invalid role provided" })
    }

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      user: users[0],
    })
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({ message: "Server error while getting user data" })
  }
}

// Logout Controller
exports.logoutUser = async (req, res) => {
  try {
    const userId = req.user.id // Get the current user's ID
    const userRole = req.user.role // Get the user's role

    console.log("Logging out User ID:", userId, "Role:", userRole) // Debugging

    // Update the verified status in the database
    if (userRole === "student") {
      await pool.query("UPDATE Users SET verified = 0 WHERE id = ?", [userId])
      console.log("Verified status updated for student")
    } else if (userRole === "committee") {
      await pool.query("UPDATE MessCommitteeMembers SET verified = 0 WHERE member_id = ?", [userId])
      console.log("Verified status updated for committee member")
    } else {
      console.error("Invalid user role")
      return res.status(400).json({ message: "Invalid role provided" })
    }

    // Respond with success
    res.status(200).json({ message: "Logout successful. Redirecting to index page." })
  } catch (error) {
    console.error("Logout error:", error) // Log the error for debugging
    res.status(500).json({ message: "Server error while logging out" })
  }
}
