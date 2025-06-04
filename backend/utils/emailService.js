const nodemailer = require("nodemailer")
const dotenv = require("dotenv")

dotenv.config()

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Send OTP via email
async function sendOTPEmail(email, otp) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Hostel Mess Committee Helper - OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Email Verification</h2>
          <p>Your OTP for email verification is:</p>
          <h1 style="font-size: 36px; letter-spacing: 2px; background-color: #f7fafc; padding: 10px; text-align: center;">${otp}</h1>
          <p>This OTP will expire in ${process.env.OTP_EXPIRY || 10} minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>Thank you,<br>Hostel Mess Committee Helper Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent: " + info.response)
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

async function sendRebateStatusEmail(email, name, status, startDate, endDate, rebateAmount = 0) {
  try {
    const subject = `Mess Rebate Application ${status.charAt(0).toUpperCase() + status.slice(1)}`
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Hostel Mess Committee Helper - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Mess Rebate Application Status Update</h2>
          <p>Dear ${name},</p>
          <p>Your mess rebate application for the period <b>${startDate}</b> to <b>${endDate}</b> has been <b>${status}</b>.</p>
          ${
            status === "approved"
              ? `<p>The rebate amount of <b>₹${rebateAmount}</b> will be credited to your account within 3-4 working days.</p>`
              : "<p>Please contact the mess committee for more information.</p>"
          }
          <p>Thank you,<br>Hostel Mess Committee Helper Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent: " + info.response)
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

// Send inventory alert
async function sendInventoryAlert(itemName, availableAmount, requiredAmount, unitofMeasure, committeeMemberEmail) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: committeeMemberEmail, // Send to admin
      subject: "Hostel Mess Committee Helper - Low Inventory Alert",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">Low Inventory Alert</h2>
          <p>The following item is running low in the inventory:</p>
          <div style="background-color: #fff5f5; padding: 15px; border-left: 4px solid #e53e3e;">
            <p><b>Item:</b> ${itemName}</p>
            <p><b>Available:</b> ${availableAmount} ${unitofMeasure}</p>
            <p><b>Required:</b> ${requiredAmount} ${unitofMeasure}</p>
            <p><b>Shortage:</b> ${requiredAmount - availableAmount} ${unitofMeasure}</p>
          </div>
          <p>Please replenish the inventory as soon as possible.</p>
          <p>Thank you,<br>Hostel Mess Committee Helper System</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent: " + info.response)
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

module.exports = {
  sendOTPEmail,
  sendRebateStatusEmail,
  sendInventoryAlert,
}
