const express = require("express")
const router = express.Router()
const committeeController = require("../controllers/committeeController")
const { protect, restrictTo } = require("../middleware/auth")

// Apply middleware to all routes
router.use(protect)
router.use(restrictTo("committee"))

// Get all feedback
router.get("/feedback", committeeController.getAllFeedback)

// Update menu
router.post("/menu", committeeController.updateMenu)

router.get("/get-menu", committeeController.getMenuForDay)

// Inventory routes
router.get("/inventory", committeeController.getInventory)
router.post("/food-items", committeeController.addFoodItem)
// Get all food items
router.get("/food-items", committeeController.getAllFoodItems)

router.post("/inventory", committeeController.addInventoryItem)
router.post("/inventoryupdate", committeeController.updateInventory)

// Expenses routes
router.get("/expenses", committeeController.getExpenses)
router.post("/expenses", committeeController.addExpense)
router.delete("/expenses/:id", committeeController.deleteExpense)

// Rebate routes
router.get("/rebates", committeeController.getAllRebates)
router.post("/rebates/:rebateId", committeeController.updateRebateStatus)

// Notice routes
router.post("/notice", committeeController.addNotice)

// Route for updating mess timings
router.post("/update-timings", committeeController.updateMessTimings)

// Route to fetch timings for a specific day
router.get("/get-timings", committeeController.getMessTimings)

// Fetch all employees
router.get("/employees", committeeController.getAllEmployees)

// Add a new employee
router.post("/employees", committeeController.addEmployee)

// Update employee info
router.post("/employees/:id", committeeController.updateEmployeeInfo)

// Delete an employee
router.delete("/employees/:id", committeeController.deleteEmployee)

module.exports = router
