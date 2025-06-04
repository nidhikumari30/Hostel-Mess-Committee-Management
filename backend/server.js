const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const path = require("path")
//const bodyParser = require('body-parser');

// Load environment variables
dotenv.config()

// Import routes
const authRoutes = require("./routes/auth")
const studentRoutes = require("./routes/student")
const committeeRoutes = require("./routes/committee")

// Initialize express app
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/auth", authRoutes)
app.use("/student", studentRoutes)
app.use("/committee", committeeRoutes)

// Serve static files from the 'frontend' folder
app.use(express.static(path.join(__dirname, "../frontend")))

// Setting EJS as templating engine
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "../frontend/views"))

// Default route
app.get("/", (req, res) => {
  res.render("index")
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
