const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const multer = require('multer');
const fs = require('fs');

// เปิดการใช้งาน seedDatabase ชั่วคราวเพื่อสร้างฐานข้อมูลใหม่
const seedDatabase = require('./seed'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = process.env.PORT || 3001;

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'public/images');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


const db = new sqlite3.Database('./bts_explorer.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the bts_explorer database.');
    // เรียกใช้ seedDatabase เพื่อสร้างฐานข้อมูลใหม่
   seedDatabase(db); 
});

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

const safeJsonParse = (data, fallback = null) => {
    if (typeof data !== 'string' || !data) return fallback;
    try {
        const parsed = JSON.parse(data);
        if (parsed === null) return fallback;
        if (Object.keys(parsed).length === 0 && fallback !== null && Array.isArray(fallback)) return fallback;
        return parsed;
    } catch (e) {
        return fallback;
    }
};

// --- API ENDPOINTS ---

// Image Upload
app.post('/api/upload', upload.single('placeImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const imageUrl = `http://localhost:${PORT}/images/${req.file.filename}`;
    res.json({ imageUrl });
});

// --- Places CRUD ---
app.get('/api/places', (req, res) => {
    db.all("SELECT * FROM places ORDER BY name", [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

app.post('/api/places/add', (req, res) => {
    const { name, description, station_id, category, latitude, longitude, image, openingHours, travelInfo, phone, gallery, contact } = req.body;
    const location = (latitude && longitude) ? JSON.stringify({ lat: parseFloat(latitude), lng: parseFloat(longitude) }) : null;
    const sql = `INSERT INTO places (name, description, station_id, category, location, image, openingHours, travelInfo, phone, gallery, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, description, station_id, category, location, image, openingHours, travelInfo, phone, gallery, contact];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ message: 'Place added successfully', id: this.lastID });
    });
});

app.put('/api/places/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, station_id, category, latitude, longitude, image, openingHours, travelInfo, phone, gallery, contact } = req.body;
    const location = (latitude && longitude) ? JSON.stringify({ lat: parseFloat(latitude), lng: parseFloat(longitude) }) : null;
    const sql = `UPDATE places SET name = ?, description = ?, station_id = ?, category = ?, location = ?, image = ?, openingHours = ?, travelInfo = ?, phone = ?, gallery = ?, contact = ? WHERE id = ?`;
    const params = [name, description, station_id, category, location, image, openingHours, travelInfo, phone, gallery, contact, id];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Place updated successfully', changes: this.changes });
    });
});

app.delete('/api/places/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM places WHERE id = ?', id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        db.run('DELETE FROM reviews WHERE place_id = ?', id, () => {});
        db.run('DELETE FROM events WHERE place_id = ?', id, () => {});
        res.json({ message: 'Place deleted successfully', changes: this.changes });
    });
});


// --- Events CRUD (ส่วนที่เพิ่มเข้ามาใหม่) ---
app.get('/api/events', (req, res) => {
    const sql = `
        SELECT 
            e.id, e.place_id, e.event_date, e.title, e.description,
            p.name as placeName, p.station_id
        FROM events e
        LEFT JOIN places p ON e.place_id = p.id
        ORDER BY e.event_date DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

app.post('/api/events/add', (req, res) => {
    const { place_id, event_date, title, description } = req.body;
    if (!place_id || !event_date || !title) {
        return res.status(400).json({ error: "Missing required fields for event." });
    }
    const sql = `INSERT INTO events (place_id, event_date, title, description) VALUES (?, ?, ?, ?)`;
    db.run(sql, [place_id, event_date, title, description], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ message: 'Event added successfully', id: this.lastID });
    });
});

app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { place_id, event_date, title, description } = req.body;
    const sql = `UPDATE events SET place_id = ?, event_date = ?, title = ?, description = ? WHERE id = ?`;
    db.run(sql, [place_id, event_date, title, description, id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Event updated successfully', changes: this.changes });
    });
});

app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM events WHERE id = ?', id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Event deleted successfully', changes: this.changes });
    });
});


// --- Main App Endpoints ---
app.get('/api/stations', (req, res) => {
    db.all("SELECT * FROM stations", [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        const sortedRows = rows.sort((a, b) => {
            const regex = /^([A-Z]+)(\d+)$/;
            const matchA = a.id.match(regex);
            const matchB = b.id.match(regex);
            if (!matchA || !matchB) return a.id.localeCompare(b.id);
            const [, prefixA, numA] = matchA;
            const [, prefixB, numB] = matchB;
            if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
            return parseInt(numA, 10) - parseInt(numB, 10);
        });
        res.json({ "message": "success", "data": sortedRows });
    });
});

app.get('/api/places/:station_id', (req, res) => {
    const stationId = req.params.station_id;
    const sql = `
      SELECT 
        p.*, 
        (SELECT AVG(r.rating) FROM reviews r WHERE r.place_id = p.id) as average_rating, 
        (SELECT COUNT(r.id) FROM reviews r WHERE r.place_id = p.id) as review_count,
        (
            SELECT json_group_array(json_object('user', rev.user, 'rating', rev.rating, 'comment', rev.comment))
            FROM reviews rev
            WHERE rev.place_id = p.id
            ORDER BY rev.id DESC
        ) as reviews
      FROM places p
      WHERE p.station_id = ?
    `;
    db.all(sql, [stationId], (err, rows) => {
        if (err) {
            console.error(`Database error for station ${stationId}:`, err);
            return res.status(400).json({ "error": err.message });
        }
        const processedRows = rows.map(row => ({
            ...row,
            reviews: safeJsonParse(row.reviews, []),
            gallery: safeJsonParse(row.gallery, []),
            location: safeJsonParse(row.location, null),
            contact: safeJsonParse(row.contact, {}),
        }));
        res.json({ "message": "success", "data": processedRows });
    });
});

app.post('/api/places/:placeId/reviews', (req, res) => {
    const placeId = req.params.placeId;
    const { user, rating, comment } = req.body;
    const insertSql = `INSERT INTO reviews (place_id, user, rating, comment) VALUES (?, ?, ?, ?)`;
    db.run(insertSql, [placeId, user, rating, comment], function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "Review added successfully", "id": this.lastID });
    });
});

// --- Socket.IO & Server Start ---
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server with Socket.IO listening on ${PORT}`);
});

