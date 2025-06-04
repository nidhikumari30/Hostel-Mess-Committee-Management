const pool = require("../db")
const { sendRebateStatusEmail, sendInventoryAlert } = require("../utils/emailService")

// View all student feedback
exports.getAllFeedback = async (req, res) => {
  try {
    // Get all feedback with student information
    const [feedback] = await pool.query(
      `SELECT f.id, f.message, f.date, u.name as student_name, u.email as student_email 
       FROM Feedback f 
       JOIN Users u ON f.student_id = u.id 
       ORDER BY f.date DESC`,
    )

    res.status(200).json({ feedback })
  } catch (error) {
    console.error("Get feedback error:", error)
    res.status(500).json({ message: "Server error while fetching feedback" })
  }
}

// Update daily menu
exports.updateMenu = async (req, res) => {
  try {
    const { day_of_week, mealType, itemsList } = req.body

    // Log incoming request data for debugging
    //console.log('Update Menu Request:', req.body);

    if (!day_of_week || !mealType || !itemsList) {
      return res.status(400).json({ message: "Please provide day, meal type, and items list." })
    }

    // Validate meal type
    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      //console.log('Invalid meal type:', mealType);
      return res.status(400).json({ message: "Meal type must be breakfast, lunch, or dinner." })
    }

    const [existingMenu] = await pool.query("SELECT * FROM Menu WHERE day_of_week = ? AND meal_type = ?", [
      day_of_week,
      mealType,
    ])

    //console.log('Existing menu:', existingMenu);

    if (existingMenu.length > 0) {
      await pool.query("UPDATE Menu SET items_list = ? WHERE day_of_week = ? AND meal_type = ?", [
        itemsList,
        day_of_week,
        mealType,
      ])
      //console.log('Menu updated successfully');
      return res.status(200).json({ message: "Menu updated successfully." })
    } else {
      await pool.query("INSERT INTO Menu (day_of_week, meal_type, items_list) VALUES (?, ?, ?)", [
        day_of_week,
        mealType,
        itemsList,
      ])
      //console.log('Menu created successfully');
      return res.status(201).json({ message: "Menu created successfully." })
    }
  } catch (error) {
    console.error("Update menu error:", error)
    res.status(500).json({ message: "Server error while updating menu." })
  }
}

//get menu for a day
exports.getMenuForDay = async (req, res) => {
  try {
    const { day_of_week } = req.query

    if (!day_of_week) {
      return res.status(400).json({ message: "Please provide a valid day." })
    }

    // Fetch menu for the selected day
    const [result] = await pool.query(
      `SELECT meal_type, items_list 
       FROM Menu 
       WHERE day_of_week = ?`,
      [day_of_week],
    )

    if (result.length === 0) {
      return res.status(404).json({ message: "No menu found for the selected day." })
    }

    res.status(200).json({ menu: result })
  } catch (error) {
    console.error("Error fetching menu:", error)
    res.status(500).json({ message: "Server error while fetching menu." })
  }
}

// Get inventory
exports.getInventory = async (req, res) => {
  try {
    // Get all inventory items with food item details
    const [inventory] = await pool.query(
      `SELECT i.id, i.required_amount, i.available_amount, i.last_updated,
       f.id as food_item_id, f.name, f.unit_price, f.unit_of_measure
       FROM Inventory i
       JOIN Food_Items f ON i.food_item_id = f.id
       ORDER BY f.name`,
    )

    res.status(200).json({ inventory })
  } catch (error) {
    console.error("Get inventory error:", error)
    res.status(500).json({ message: "Server error while fetching inventory" })
  }
}

// Add new food item
exports.addFoodItem = async (req, res) => {
  try {
    const { name, unitPrice, unitOfMeasure } = req.body

    // Validate input
    if (!name || !unitPrice || !unitOfMeasure) {
      return res.status(400).json({
        message: "Please provide name, unit price, and unit of measure",
      })
    }

    // Check if food item already exists
    const [existingItems] = await pool.query("SELECT * FROM Food_Items WHERE name = ?", [name])

    if (existingItems.length > 0) {
      return res.status(400).json({ message: "Food item already exists" })
    }

    // Insert new food item
    const [result] = await pool.query("INSERT INTO Food_Items (name, unit_price, unit_of_measure) VALUES (?, ?, ?)", [
      name,
      unitPrice,
      unitOfMeasure,
    ])

    res.status(201).json({
      message: "Food item added successfully",
      foodItemId: result.insertId,
    })
  } catch (error) {
    console.error("Add food item error:", error)
    res.status(500).json({ message: "Server error while adding food item" })
  }
}

//get all food items
exports.getAllFoodItems = async (req, res) => {
  try {
    // Fetch all food items
    const [items] = await pool.query("SELECT * FROM Food_Items ORDER BY created_at DESC")
    res.status(200).json({ items })
  } catch (error) {
    console.error("Error fetching food items:", error)
    res.status(500).json({ message: "Server error while fetching food items" })
  }
}

// Update inventory
exports.updateInventory = async (req, res) => {
  try {
    const { inventoryId, requiredAmount, availableAmount } = req.body

    // Validate input
    if (!inventoryId || (!requiredAmount && requiredAmount !== 0 && !availableAmount && availableAmount !== 0)) {
      return res.status(400).json({
        message: "Please provide inventory ID and either required or available amount",
      })
    }

    // Get existing inventory item
    const [inventoryItems] = await pool.query(
      `SELECT i.*, f.name, f.unit_of_measure
       FROM Inventory i
       JOIN Food_Items f ON i.food_item_id = f.id
       WHERE i.id = ?`,
      [inventoryId],
    )

    if (inventoryItems.length === 0) {
      return res.status(404).json({ message: "Inventory item not found" })
    }

    const inventoryItem = inventoryItems[0]

    // Prepare update query
    let updateQuery = "UPDATE Inventory SET "
    const updateValues = []

    if (requiredAmount !== undefined) {
      updateQuery += "required_amount = ?, "
      updateValues.push(requiredAmount)
    }

    if (availableAmount !== undefined) {
      updateQuery += "available_amount = ?, "
      updateValues.push(availableAmount)
    }

    updateQuery += "last_updated = NOW() WHERE id = ?"
    updateValues.push(inventoryId)

    // Update inventory
    await pool.query(updateQuery, updateValues)

    // Check if inventory is low and send alert if necessary
    if (availableAmount !== undefined) {
      const threshold = 0.2 // 20% threshold
      const newAvailableAmount = Number.parseFloat(availableAmount)
      const requiredAmountToCheck =
        requiredAmount !== undefined
          ? Number.parseFloat(requiredAmount)
          : Number.parseFloat(inventoryItem.required_amount)

      if (newAvailableAmount < requiredAmountToCheck * threshold) {
        // Send inventory alert
        await sendInventoryAlert(
          inventoryItem.name,
          newAvailableAmount,

          requiredAmountToCheck,
          inventoryItem.unit_of_measure,
          req.user.email, // Pass logged-in user's email
        )
      }
    }

    res.status(200).json({
      message: "Inventory updated successfully",
    })
  } catch (error) {
    console.error("Update inventory error:", error)
    res.status(500).json({ message: "Server error while updating inventory" })
  }
}

// Add new inventory item
exports.addInventoryItem = async (req, res) => {
  try {
    const { foodItemId, requiredAmount, availableAmount } = req.body

    // Validate input
    if (!foodItemId || requiredAmount === undefined || availableAmount === undefined) {
      return res.status(400).json({
        message: "Please provide food item ID, required amount, and available amount",
      })
    }

    // Check if food item exists
    const [foodItems] = await pool.query("SELECT * FROM Food_Items WHERE id = ?", [foodItemId])

    if (foodItems.length === 0) {
      return res.status(404).json({ message: "Food item not found" })
    }

    const fooditem = foodItems[0]

    // Check if inventory item already exists for this food item
    const [existingInventory] = await pool.query("SELECT * FROM Inventory WHERE food_item_id = ?", [foodItemId])

    if (existingInventory.length > 0) {
      return res.status(400).json({
        message: "Inventory item already exists for this food item",
      })
    }

    // Insert new inventory item
    const [result] = await pool.query(
      "INSERT INTO Inventory (food_item_id, required_amount, available_amount) VALUES (?, ?, ?)",
      [foodItemId, requiredAmount, availableAmount],
    )

    console.log(result)
    // Check if inventory is low and send alert if necessary
    const threshold = 0.2 // 20% threshold
    if (Number.parseFloat(availableAmount) < Number.parseFloat(requiredAmount) * threshold) {
      // Send inventory alert
      await sendInventoryAlert(
        foodItems[0].name,

        availableAmount,

        requiredAmount,
        fooditem.unit_of_measure,
        req.user.email, // Pass logged-in user's email
      )
    }

    res.status(201).json({
      message: "Inventory item added successfully",
      inventoryId: result.insertId,
    })
  } catch (error) {
    console.error("Add inventory item error:", error)
    res.status(500).json({ message: "Server error while adding inventory item" })
  }
}

// Get monthly expenses
exports.getExpenses = async (req, res) => {
  try {
    const { month, year } = req.query

    // Validate input
    if (!month || !year) {
      return res.status(400).json({ message: "Please provide month and year" })
    }

    // Get expenses for the specified month and year
    const [expenses] = await pool.query(
      `SELECT e.id, e.total_cost, e.month, e.year, e.created_at,
       f.id as food_item_id, f.name, f.unit_of_measure
       FROM Expenses e
       JOIN Food_Items f ON e.food_item_id = f.id
       WHERE e.month = ? AND e.year = ?
       ORDER BY e.total_cost DESC`,
      [month, year],
    )

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number.parseFloat(expense.total_cost), 0)

    res.status(200).json({
      month,
      year,
      expenses,
      totalExpenses,
    })
  } catch (error) {
    console.error("Get expenses error:", error)
    res.status(500).json({ message: "Server error while fetching expenses" })
  }
}

//add expenses
exports.addExpense = async (req, res) => {
  try {
    const { foodItemId, quantity, month, year } = req.body

    // Validate input
    if (!foodItemId || !quantity || !month || !year) {
      return res.status(400).json({
        message: "Please provide food item ID, quantity, month, and year",
      })
    }

    // Check if food item exists
    const [foodItems] = await pool.query("SELECT * FROM Food_Items WHERE id = ?", [foodItemId])

    if (foodItems.length === 0) {
      return res.status(404).json({ message: "Food item not found" })
    }

    const foodItem = foodItems[0]
    const totalCost = Number.parseFloat(foodItem.unit_price) * Number.parseFloat(quantity) // Calculate total cost

    // Insert expense into the database
    const [result] = await pool.query(
      "INSERT INTO Expenses (food_item_id, total_cost, month, year) VALUES (?, ?, ?, ?)",
      [foodItemId, totalCost, month, year],
    )

    res.status(201).json({
      message: "Expense added successfully",
      expenseId: result.insertId,
      totalCost,
    })
  } catch (error) {
    console.error("Add expense error:", error)
    res.status(500).json({ message: "Server error while adding expense" })
  }
}

// Get all rebate applications
exports.getAllRebates = async (req, res) => {
  

  try {
    const { status } = req.query

    // Prepare query based on status filter
    let query = `
      SELECT r.id, r.start_date, r.end_date, r.duration, r.status, r.created_at,
      u.id as student_id, u.name as student_name, u.email as student_email
      FROM Mess_Rebate r
      JOIN Users u ON r.student_id = u.id
    `

    const queryParams = []

    if (status) {
      query += " WHERE r.status = ?"
      queryParams.push(status)
    }

    query += " ORDER BY r.created_at DESC"

    // Get rebate applications
    const [rebates] = await pool.query(query, queryParams)
    console.log("Fetched rebates:", rebates);

    res.status(200).json({ rebates })
  } catch (error) {
    console.error("Get rebates error:", error)
    res.status(500).json({ message: "Server error while fetching rebates" })
  }
}

// // Approve or reject rebate
// exports.updateRebateStatus = async (req, res) => {
//   try {
//     const { rebateId } = req.params
//     const { status } = req.body

//     // Validate input
//     if (!status || !["approved", "rejected"].includes(status)) {
//       return res.status(400).json({
//         message: "Please provide a valid status (approved or rejected)",
//       })
//     }

//     // Fetch the rebate application details
//     const [rebates] = await pool.query(
//       `SELECT r.*, u.name, u.email
//        FROM Mess_Rebate r
//        JOIN Users u ON r.student_id = u.id
//        WHERE r.id = ?`,
//       [rebateId],
//     )

//     if (rebates.length === 0) {
//       return res.status(404).json({ message: "Rebate application not found" })
//     }

//     const rebate = rebates[0]

//     // Check if the rebate has already been processed
//     if (rebate.status !== "pending") {
//       return res.status(400).json({
//         message: `Rebate application is already ${rebate.status}`,
//       })
//     }

//     // Calculate rebate amount if approved
//     let rebateAmount = 0
//     if (status === "approved") {
//       rebateAmount = rebate.duration * 120 // Formula: duration * 120
//     }

//     // Update rebate status and rebate amount in the database
//     await pool.query("UPDATE Mess_Rebate SET status = ?, rebate_amt = ? WHERE id = ?", [status, rebateAmount, rebateId])

//     // Send email notification
//     await sendRebateStatusEmail(
//       rebate.email,
//       rebate.name,
//       status,
//       new Date(rebate.start_date).toLocaleDateString(),
//       new Date(rebate.end_date).toLocaleDateString(),
//       rebateAmount, // Pass the calculated rebate amount
//     )

//     res.status(200).json({
//       message: `Rebate application ${status} successfully`,
//     })
//   } catch (error) {
//     console.error("Update rebate status error:", error)
//     res.status(500).json({ message: "Server error while updating rebate status" })
//   }
// }

exports.updateRebateStatus = async (req, res) => {
  try {
    const { rebateId } = req.params
    const { status } = req.body
    const currentUserId = req.user?.id // ID of the logged-in user

    // Validate input
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Please provide a valid status (approved or rejected)",
      })
    }

    // Fetch the rebate application details
    const [rebates] = await pool.query(
      `SELECT r.*, u.name, u.email
       FROM Mess_Rebate r
       JOIN Users u ON r.student_id = u.id
       WHERE r.id = ?`,
      [rebateId],
    )

    if (rebates.length === 0) {
      return res.status(404).json({ message: "Rebate application not found" })
    }

    const rebate = rebates[0]

    if (rebate.status !== "pending") {
      return res.status(400).json({
        message: `Rebate application is already ${rebate.status}`,
      })
    }

    // Calculate rebate amount if approved
    let rebateAmount = 0
    if (status === "approved") {
      rebateAmount = rebate.duration * 120
    }

    // Update rebate status, amount, and processed_by
    await pool.query(
      `UPDATE Mess_Rebate
       SET status = ?, rebate_amt = ?, processed_by = ?
       WHERE id = ?`,
      [status, rebateAmount, currentUserId, rebateId],
    )

    await sendRebateStatusEmail(
      rebate.email,
      rebate.name,
      status,
      new Date(rebate.start_date).toLocaleDateString(),
      new Date(rebate.end_date).toLocaleDateString(),
      rebateAmount,
    )

    res.status(200).json({
      message: `Rebate application ${status} successfully`,
    })
  } catch (error) {
    console.error("Update rebate status error:", error)
    res.status(500).json({ message: "Server error while updating rebate status" })
  }
}


// Add a notice
exports.addNotice = async (req, res) => {
  try {
    const { title, content } = req.body
    const committeeId = req.user.id

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ message: "Please provide title and content" })
    }

    // Insert notice
    const [result] = await pool.query("INSERT INTO Notices (title, content, posted_by) VALUES (?, ?, ?)", [
      title,
      content,
      committeeId,
    ])

    res.status(201).json({
      message: "Notice added successfully",
      noticeId: result.insertId,
    })
  } catch (error) {
    console.error("Add notice error:", error)
    res.status(500).json({ message: "Server error while adding notice" })
  }
}

//update mess timings
exports.updateMessTimings = async (req, res) => {
  try {
    const { day, breakfastFrom, breakfastTo, lunchFrom, lunchTo, dinnerFrom, dinnerTo } = req.body

    // Validate input
    if (!day || !breakfastFrom || !breakfastTo || !lunchFrom || !lunchTo || !dinnerFrom || !dinnerTo) {
      return res.status(400).json({ message: "Please provide all fields." })
    }

    // Update the timings in the MessTimings table
    const [result] = await pool.query(
      `UPDATE MessTimings 
           SET breakfast_from = ?, breakfast_to = ?, lunch_from = ?, lunch_to = ?, dinner_from = ?, dinner_to = ? 
           WHERE day_of_week = ?`,
      [breakfastFrom, breakfastTo, lunchFrom, lunchTo, dinnerFrom, dinnerTo, day],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Day not found." })
    }

    res.status(200).json({ message: "Mess timings updated successfully." })
  } catch (error) {
    console.error("Error updating mess timings:", error)
    res.status(500).json({ message: "Server error while updating mess timings." })
  }
}

//get mess timings
exports.getMessTimings = async (req, res) => {
  try {
    const { day } = req.query

    if (!day) {
      return res.status(400).json({ message: "Please provide a valid day." })
    }

    // Fetch timings for the selected day
    const [result] = await pool.query(
      `SELECT breakfast_from, breakfast_to, lunch_from, lunch_to, dinner_from, dinner_to 
           FROM MessTimings 
           WHERE day_of_week = ?`,
      [day],
    )

    if (result.length === 0) {
      return res.status(404).json({ message: "No timings found for the selected day." })
    }

    res.status(200).json({ timings: result[0] })
  } catch (error) {
    console.error("Error fetching mess timings:", error)
    res.status(500).json({ message: "Server error while fetching mess timings." })
  }
}

//get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const [employees] = await pool.query("SELECT * FROM Mess_Employees ORDER BY created_at DESC")
    res.status(200).json({ employees })
  } catch (error) {
    console.error("Error fetching employees:", error)
    res.status(500).json({ message: "Server error while fetching employees" })
  }
}

exports.addEmployee = async (req, res) => {
  try {
    const { name, role, phone_no, salary, address, joining_date } = req.body

    // Validate input
    if (!name || !role || !phone_no || !salary || !joining_date) {
      return res.status(400).json({ message: "Please provide all required fields." })
    }

    // Insert new employee
    await pool.query(
      `INSERT INTO Mess_Employees (name, role, phone_no, salary, address, joining_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, role, phone_no, salary, address, joining_date],
    )

    res.status(201).json({ message: "Employee added successfully." })
  } catch (error) {
    console.error("Error adding employee:", error)
    res.status(500).json({ message: "Server error while adding employee." })
  }
}

exports.updateEmployeeInfo = async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, phone_no, salary, address } = req.body

    // Validate input
    if (!id || !name || !role || !phone_no || !salary) {
      return res.status(400).json({ message: "Please provide all required fields." })
    }

    // Update employee information
    const [result] = await pool.query(
      `UPDATE Mess_Employees
       SET name = ?, role = ?, phone_no = ?, salary = ?, address = ?
       WHERE id = ?`,
      [name, role, phone_no, salary, address, id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Employee not found." })
    }

    res.status(200).json({ message: "Employee info updated successfully." })
  } catch (error) {
    console.error("Error updating employee info:", error)
    res.status(500).json({ message: "Server error while updating employee info." })
  }
}

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params

    // Delete employee by ID
    const [result] = await pool.query("DELETE FROM Mess_Employees WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Employee not found." })
    }

    res.status(200).json({ message: "Employee deleted successfully." })
  } catch (error) {
    console.error("Error deleting employee:", error)
    res.status(500).json({ message: "Server error while deleting employee." })
  }
}

//delete expenses
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params

    // Validate the expense ID
    if (!id) {
      return res.status(400).json({ message: "Please provide a valid expense ID." })
    }

    // Check if the expense exists
    const [existingExpense] = await pool.query("SELECT * FROM Expenses WHERE id = ?", [id])

    if (existingExpense.length === 0) {
      return res.status(404).json({ message: "Expense not found." })
    }

    // Delete the expense
    const [result] = await pool.query("DELETE FROM Expenses WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to delete expense." })
    }

    res.status(200).json({ message: "Expense deleted successfully." })
  } catch (error) {
    console.error("Error deleting expense:", error)
    res.status(500).json({ message: "Server error while deleting expense." })
  }
}
