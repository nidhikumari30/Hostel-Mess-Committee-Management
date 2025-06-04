const mysql = require("mysql2/promise")
const dotenv = require("dotenv")

dotenv.config()

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "dimpal@2012",
  database: process.env.DB_NAME || "hostelmess",
}

// Create a connection pool
const pool = mysql.createPool(dbConfig)

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log("Database connected successfully")
    connection.release()
  } catch (error) {
    console.error("Database connection failed:", error)
    process.exit(1)
  }
}

// Initialize database with required tables if they don't exist
async function initDatabase() {
  try {
    const connection = await pool.getConnection()

    // Create Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'committee') NOT NULL,
    phone_no VARCHAR(15) NOT NULL, -- New field for phone number
    hostel_name VARCHAR(100) NOT NULL, -- New field for hostel name
    room_no VARCHAR(10) NOT NULL, -- New field for room number
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

    `)

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

    // Create Menu table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Menu (
        id INT PRIMARY KEY AUTO_INCREMENT,
        day_of_week VARCHAR(10) NOT NULL,
        meal_type ENUM('breakfast', 'lunch', 'dinner') NOT NULL,
        items_list TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Create MessTimings table
    await connection.query(`
     CREATE TABLE If not exists MessTimings (
    id INT AUTO_INCREMENT PRIMARY KEY,      -- Unique ID for each row
    day_of_week VARCHAR(10) NOT NULL,       -- Name of the day (e.g., Monday)
    breakfast_from TIME NOT NULL,           -- Breakfast start time
    breakfast_to TIME NOT NULL,             -- Breakfast end time
    lunch_from TIME NOT NULL,               -- Lunch start time
    lunch_to TIME NOT NULL,                 -- Lunch end time
    dinner_from TIME NOT NULL,              -- Dinner start time
    dinner_to TIME NOT NULL                 -- Dinner end time
);
`)

    // Create MessCommitteeMembers table
    await connection.query(`
CREATE TABLE IF NOT EXISTS MessCommitteeMembers (
    member_id INT AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each committee member
    name VARCHAR(100) NOT NULL, -- Member's full name
    email VARCHAR(100) UNIQUE NOT NULL, -- Member's email (must be unique)
    password VARCHAR(255) NOT NULL, -- Hashed password for secure login
    phone_no VARCHAR(15) NOT NULL, -- Contact number of the member
    designation VARCHAR(100) NOT NULL, -- Role in the mess committee (e.g., Secretary)
    role ENUM('committee') DEFAULT 'committee' NOT NULL, -- Role column with default value 'committee'
    otp_code VARCHAR(6), -- OTP code for email verification
    otp_expiry TIMESTAMP, -- Expiry time for the OTP
    verified BOOLEAN DEFAULT false, -- Indicates whether the member's email is verified
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Record creation timestamp
);
 `)

         // Create Notices table
         await connection.query(`
          CREATE TABLE IF NOT EXISTS Notices (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            posted_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (posted_by) REFERENCES MessCommitteeMembers(member_id)
          )
        `)

    // Create Employees table
    await connection.query(`
 CREATE TABLE IF NOT EXISTS Mess_Employees (
    id INT AUTO_INCREMENT PRIMARY KEY,       -- Unique ID for each employee
    name VARCHAR(100) NOT NULL,              -- Employee name
    role VARCHAR(50) NOT NULL,               -- Role (e.g., cook, manager, cleaner)
    phone_no VARCHAR(15) NOT NULL,           -- Employee phone number
    salary DECIMAL(10, 2) NOT NULL,          -- Monthly salary
    joining_date DATE NOT NULL,              -- Joining date
    address TEXT,                            -- Address of the employee
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Timestamp for creation
);

  `)

      // Create Mess Rebate table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS Mess_Rebate (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INT NOT NULL, -- Rebate duration in days
  rebate_amt DECIMAL(10, 2) DEFAULT 0, -- Rebate amount
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_by INT DEFAULT NULL, -- ID of the mess committee member who processed it
  FOREIGN KEY (student_id) REFERENCES Users(id),
  FOREIGN KEY (processed_by) REFERENCES MessCommitteeMembers(member_id)
);

       
         `)


    console.log("Database tables initialized successfully")
    connection.release()
  } catch (error) {
    console.error("Failed to initialize database tables:", error)
    process.exit(1)
  }
}

// Execute database initialization when this module is imported
testConnection().then(() => {
  initDatabase()
})

module.exports = pool
