// server.js (เวอร์ชันปรับปรุง)

// --- 1. Import Dependencies ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const util = require('util'); // สำหรับ Promisify

// --- 2. Initialize App, Server, and Socket.IO ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3001;

// --- 4. Connect to SQLite Database ---
const db = new sqlite3.Database('./bts_explorer.db', (err) => {
    if (err) {
        console.error("❌ Error opening database:", err.message);
        process.exit(1); // ออกจากโปรแกรมถ้าเชื่อมต่อ DB ไม่ได้
    }
    console.log("✅ Connected to the SQLite database.");
});

// สร้างเวอร์ชันของ db methods ที่คืนค่า Promise เพื่อใช้กับ async/await
const dbRun = util.promisify(db.run.bind(db));
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

// สร้างตารางเมื่อเซิร์ฟเวอร์เริ่มทำงาน
const initializeDb = async () => {
    try {
        await dbRun(`CREATE TABLE IF NOT EXISTS stations (id TEXT PRIMARY KEY, name TEXT NOT NULL)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS places (id INTEGER PRIMARY KEY AUTOINCREMENT, station_id TEXT NOT NULL, name TEXT NOT NULL, category TEXT, description TEXT, image TEXT, gallery TEXT, openingHours TEXT, travelInfo TEXT, phone TEXT, contact TEXT, location TEXT, events TEXT, reviews TEXT, FOREIGN KEY (station_id) REFERENCES stations (id))`);
        console.log("✔️ Tables are initialized and ready.");
    } catch (err) {
        console.error("❌ Error initializing tables:", err.message);
    }
};
initializeDb();

// --- 5. Helper Functions ---

// ฟังก์ชันแปลงข้อมูลจาก DB (JSON String -> Object/Array)
const parsePlace = (place) => {
    if (!place) return null;
    try {
        return {
            ...place,
            gallery: JSON.parse(place.gallery || '[]'),
            contact: JSON.parse(place.contact || '{}'),
            location: JSON.parse(place.location || '{}'),
            events: JSON.parse(place.events || '[]'),
            reviews: JSON.parse(place.reviews || '[]'),
        };
    } catch (e) {
        console.error(`Error parsing place data for ID ${place.id}:`, e);
        return place; // คืนค่าเดิมถ้าแปลงไม่ได้
    }
};

// --- 6. API Endpoints (ใช้ Async/Await) ---

// Get all stations
app.get('/api/stations', async (req, res) => {
    try {
        const sql = "SELECT * FROM stations ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC";
        const rows = await dbAll(sql, []);
        res.json({ message: "success", data: rows });
    } catch (err) {
        console.error("Error fetching stations:", err.message);
        res.status(500).json({ error: "Failed to fetch stations" });
    }
});

// Get places for a specific station
app.get('/api/places/:stationId', async (req, res) => {
    try {
        const sql = "SELECT * FROM places WHERE station_id = ?";
        const rows = await dbAll(sql, [req.params.stationId]);
        const places = rows.map(parsePlace); // ใช้ helper function
        res.json({ message: "success", data: places });
    } catch (err) {
        console.error(`Error fetching places for station ${req.params.stationId}:`, err.message);
        res.status(500).json({ error: "Failed to fetch places" });
    }
});

// Add a new review to a place
app.post('/api/places/:id/reviews', async (req, res) => {
    try {
        const placeId = req.params.id;
        const newReview = req.body;

        const row = await dbGet("SELECT * FROM places WHERE id = ?", [placeId]);
        if (!row) {
            return res.status(404).json({ error: "Place not found" });
        }

        const reviews = JSON.parse(row.reviews || '[]');
        reviews.push(newReview);

        await dbRun("UPDATE places SET reviews = ? WHERE id = ?", [JSON.stringify(reviews), placeId]);

        // สร้างข้อมูลที่สมบูรณ์เพื่อส่งกลับไป (รวมรีวิวใหม่)
        const updatedPlaceData = { ...row, reviews };
        const parsedPlace = parsePlace(updatedPlaceData); // ใช้ helper function เพื่อให้ข้อมูลมีรูปแบบเดียวกัน

        io.emit('review_updated', parsedPlace); // ส่งข้อมูลที่แปลงแล้วไปให้ Client

        res.status(201).json({ message: "Review added successfully", data: newReview });
    } catch (err) {
        console.error(`Error adding review to place ${req.params.id}:`, err.message);
        res.status(500).json({ error: "Failed to add review" });
    }
});

// --- 7. Socket.IO Connection Logic ---
io.on('connection', (socket) => {
    console.log(`🎉 User connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`🔥 User disconnected: ${socket.id}`);
    });
});

// --- 8. Start the Server ---
server.listen(PORT, () => {
    console.log(`🚀 Server running with Real-time support on port ${PORT}`);
});