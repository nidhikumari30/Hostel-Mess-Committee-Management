const mysql = require("mysql2/promise")
const dotenv = require("dotenv")
const path = require("path")

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") })

// Database configuration without database name
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "ayu123",
}

async function setupDatabase() {
  let connection

  try {
    // Connect to MySQL server
    connection = await mysql.createConnection(dbConfig)
    console.log("Connected to MySQL server")

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "hostel_mess"}`)
    console.log(`Database '${process.env.DB_NAME || "hostel_mess"}' created or already exists`)

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || "hostel_mess"}`)
    console.log(`Using database '${process.env.DB_NAME || "hostel_mess"}'`)

    // Create Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'committee') NOT NULL,
        otp_code VARCHAR(6),
        otp_expiry TIMESTAMP,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("Users table created or already exists")

    // Create Notices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Notices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        posted_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES Users(id)
      )
    `)
    console.log("Notices table created or already exists")

    // Create Food_Items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Food_Items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        unit_of_measure VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("Food_Items table created or already exists")

    // Create Inventory table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        food_item_id INT NOT NULL,
        required_amount DECIMAL(10, 2) NOT NULL,
        available_amount DECIMAL(10, 2) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (food_item_id) REFERENCES Food_Items(id)
      )
    `)
    console.log("Inventory table created or already exists")

    // Create Expenses table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Expenses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        food_item_id INT NOT NULL,
        total_cost DECIMAL(10, 2) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (food_item_id) REFERENCES Food_Items(id)
      )
    `)
    console.log("Expenses table created or already exists")

    // Create Mess_Rebate table
    await connection.query(`
    CREATE TABLE IF NOT EXISTS Mess_Rebate (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration INT NOT NULL, -- New column for rebate duration in days
    rebate_amt DECIMAL(10, 2) DEFAULT 0, -- New column for rebate amount, default 0
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Users(id)
);
    `)
    console.log("Mess_Rebate table created or already exists")

    // Create Feedback table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Feedback (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        message TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES Users(id)
      )
    `)
    console.log("Feedback table created or already exists")

    // Create Menu table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Menu (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL,
        meal_type ENUM('breakfast', 'lunch', 'dinner') NOT NULL,
        items_list TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    console.log("Menu table created or already exists")

    console.log("Database setup completed successfully")
  } catch (error) {
    console.error("Error setting up database:", error)
  } finally {
    if (connection) {
      await connection.end()
      console.log("Database connection closed")
    }
  }
}

// Run the setup
setupDatabase()
