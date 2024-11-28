const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const geolib = require("geolib");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to the database");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS schools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      latitude FLOAT NOT NULL,
      longitude FLOAT NOT NULL
    )
  `;

  db.query(createTableQuery, (err) => {
    if (err) {
      console.error("Failed to create table:", err.message);
    } else {
      console.log("Table ensured: schools");
    }
  });
});

app.post("/addSchool", (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
  db.query(query, [name, address, latitude, longitude], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err });
    }
    res.status(201).json({
      message: "School added successfully",
      schoolId: result.insertId,
    });
  });
});

app.get("/listSchools", (req, res) => {
  const { userLat, userLon } = req.query;

  if (!userLat || !userLon) {
    return res.status(400).json({ error: "User latitude and longitude are required" });
  }

  const query = "SELECT * FROM schools";
  db.query(query, (err, schools) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err });
    }

    const sortedSchools = schools
      .map((school) => {
        const distance = geolib.getDistance(
          { latitude: parseFloat(userLat), longitude: parseFloat(userLon) },
          { latitude: school.latitude, longitude: school.longitude }
        );
        return { ...school, distance };
      })
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({ schools: sortedSchools });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
