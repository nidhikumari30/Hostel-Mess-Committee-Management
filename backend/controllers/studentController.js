const pool = require("../db")

// Get daily menu
exports.getMenu = async (req, res) => {
  try {
    const { day } = req.query // Get the day from query parameters
    const queryDay = day ? day : new Date().toLocaleString("en-US", { weekday: "long" }) // Default to current day if not provided

    // Get menu for the specified day
    const [menuItems] = await pool.query(
      'SELECT * FROM Menu WHERE day_of_week = ? ORDER BY FIELD(meal_type, "breakfast", "lunch", "dinner")',
      [queryDay],
    )

    if (menuItems.length === 0) {
      return res.status(404).json({ message: `No menu found for ${queryDay}` })
    }

    res.status(200).json({
      day: queryDay,
      menu: menuItems,
    })
  } catch (error) {
    console.error("Get menu error:", error)
    res.status(500).json({ message: "Server error while fetching menu" })
  }
}

// Get notices
exports.getNotices = async (req, res) => {
  try {
    // Assume we're fetching the most recent notices (limit to 10)
    const [notices] = await pool.query(
      `SELECT n.id, n.title, n.content, n.created_at, u.name as posted_by 
       FROM Notices n 
       JOIN MessCommitteeMembers u ON n.posted_by = u.member_id 
       ORDER BY n.created_at DESC 
       LIMIT 10`,
    )

    res.status(200).json({ notices })
  } catch (error) {
    console.error("Get notices error:", error)
    res.status(500).json({ message: "Server error while fetching notices" })
  }
}

// Submit feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { message } = req.body
    const studentId = req.user.id

    // Validate input
    if (!message) {
      return res.status(400).json({ message: "Please provide feedback message" })
    }

    // Insert feedback
    const [result] = await pool.query("INSERT INTO Feedback (student_id, message) VALUES (?, ?)", [studentId, message])

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedbackId: result.insertId,
    })
  } catch (error) {
    console.error("Submit feedback error:", error)
    res.status(500).json({ message: "Server error while submitting feedback" })
  }
}

// Apply for mess rebate
exports.applyRebate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body
    const studentId = req.user.id

    // Validate input
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Please provide start and end dates" })
    }

    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" })
    }

    // Check if start date is at least 2 days in the future
    const minimumStartDate = new Date()
    minimumStartDate.setDate(minimumStartDate.getDate() + 2)
    minimumStartDate.setHours(0, 0, 0, 0)

    if (start < minimumStartDate) {
      return res.status(400).json({
        message: "Start date must be at least 2 days from today",
      })
    }

    // Check if end date is after start date
    if (end <= start) {
      return res.status(400).json({ message: "End date must be after start date" })
    }

    // Calculate rebate duration in days
    const duration = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1

    // Check if duration is at least 3 days
    if (duration < 3) {
      return res.status(400).json({
        message: "Rebate must be for at least 3 days",
      })
    }

    // Check if student already has an overlapping rebate application
    const [existingRebates] = await pool.query(
      `SELECT * FROM Mess_Rebate 
       WHERE student_id = ? 
       AND (
         (start_date <= ? AND end_date >= ?) OR 
         (start_date <= ? AND end_date >= ?) OR
         (start_date >= ? AND end_date <= ?)
       )`,
      [studentId, startDate, startDate, endDate, endDate, startDate, endDate],
    )

    if (existingRebates.length > 0) {
      return res.status(400).json({
        message: "You already have an overlapping rebate application",
      })
    }

    // Insert rebate application
    const [result] = await pool.query(
      "INSERT INTO Mess_Rebate (student_id, start_date, end_date, duration, rebate_amt, status) VALUES (?, ?, ?, ?, ?, ?)",
      [studentId, startDate, endDate, duration, 0, "pending"],
    )

    res.status(201).json({
      message: `Rebate application submitted successfully for ${duration} days.`,
      rebateId: result.insertId,
      status: "pending",
      duration,
    })
  } catch (error) {
    console.error("Rebate application error:", error)
    res.status(500).json({ message: "Server error while applying for rebate" })
  }
}

// Get student's rebate applications
exports.getMyRebates = async (req, res) => {
  try {
    const studentId = req.user.id

    // Get all rebate applications for the student
    const [rebates] = await pool.query("SELECT * FROM Mess_Rebate WHERE student_id = ? ORDER BY created_at DESC", [
      studentId,
    ])

    res.status(200).json({ rebates })
  } catch (error) {
    console.error("Get rebates error:", error)
    res.status(500).json({ message: "Server error while fetching rebates" })
  }
}

// Controller to fetch mess timings for a specific day
exports.getMessTimings = async (req, res) => {
  try {
    const dayOfWeek = req.params.day // Get day from route parameter

    // Query mess timings for the given day
    const [results] = await pool.query(
      "SELECT breakfast_from, breakfast_to, lunch_from, lunch_to, dinner_from, dinner_to FROM MessTimings WHERE day_of_week = ?",
      [dayOfWeek],
    )

    // Handle case where no timings are found
    if (results.length === 0) {
      return res.status(404).json({ message: `No mess timings found for ${dayOfWeek}` })
    }

    // Respond with mess timings
    res.status(200).json({
      message: `Mess timings for ${dayOfWeek}`,
      timings: results[0], // Return the first matching result
    })
  } catch (error) {
    console.error("Error fetching mess timings:", error)
    res.status(500).json({ message: "Server error while fetching mess timings" })
  }
}
