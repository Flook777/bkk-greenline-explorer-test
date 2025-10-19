const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
const vercelFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsOptions = {
    origin: [vercelFrontendUrl, 'http://localhost:3000'],
    methods: ["GET", "POST", "PUT", "DELETE"]
};

const io = new Server(server, {
    cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));


// --- Database Connection ---
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.connect((err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to the PostgreSQL database.');
    }
});

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

// --- API ENDPOINTS ---

// GET all places
app.get('/api/places', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM places ORDER BY name");
        const processedRows = result.rows.map(row => ({
            ...row,
            gallery: row.gallery || [],
            location: row.location || null,
            contact: row.contact || {}
        }));
        res.json({ "message": "success", "data": processedRows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": err.message });
    }
});

// ADD a new place
app.post('/api/places/add', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
    // --- DEBUG LOG ---
    console.log("Received body for ADD:", req.body);

    const { name, description, station_id, category, opening_hours, phone, latitude, longitude, contact } = req.body;
    // Handle both casings for travelinfo to prevent errors
    const travelinfo = req.body.travelinfo || req.body.travelInfo; 

    let imageUrl = null;
    if (req.files && req.files.image && req.files.image[0]) {
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
        imageUrl = `${backendUrl}/images/${req.files.image[0].filename}`;
    }

    let galleryUrls = req.body.gallery ? JSON.parse(req.body.gallery) : [];
    if (req.files && req.files.gallery) {
        const newUrls = req.files.gallery.map(file => {
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
            return `${backendUrl}/images/${file.filename}`;
        });
        galleryUrls = [...galleryUrls, ...newUrls];
    }
    
    const location = (latitude && longitude) ? JSON.stringify({ lat: parseFloat(latitude), lng: parseFloat(longitude) }) : null;
    
    const sql = `INSERT INTO places (name, description, station_id, category, image_url, "opening_hours", travelinfo, phone, location, contact, gallery) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`;
    const params = [name, description, station_id, category, imageUrl, opening_hours, travelinfo, phone, location, contact, JSON.stringify(galleryUrls)];
    
    try {
        const result = await db.query(sql, params);
        res.status(201).json({ message: 'Place added successfully', id: result.rows[0].id });
    } catch (err) {
        console.error('Error on POST /api/places/add:', err);
        res.status(400).json({ error: err.message });
    }
});


// UPDATE a place
app.put('/api/places/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
    // --- DEBUG LOG ---
    console.log("Received body for UPDATE:", req.body);
    
    const { id } = req.params;
    const { name, description, station_id, category, opening_hours, phone, latitude, longitude, contact, image_url } = req.body;
    // Handle both casings for travelinfo to prevent errors
    const travelinfo = req.body.travelinfo || req.body.travelInfo;

    let imageUrl = image_url; // Keep old image if no new one is uploaded
    if (req.files && req.files.image && req.files.image[0]) {
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
        imageUrl = `${backendUrl}/images/${req.files.image[0].filename}`;
    }
    
    let galleryUrls = req.body.gallery ? JSON.parse(req.body.gallery) : [];
    if (req.files && req.files.gallery) {
        const newUrls = req.files.gallery.map(file => {
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
            return `${backendUrl}/images/${file.filename}`;
        });
        galleryUrls = [...galleryUrls, ...newUrls];
    }
    
    const location = (latitude && longitude) ? JSON.stringify({ lat: parseFloat(latitude), lng: parseFloat(longitude) }) : null;

    const sql = `UPDATE places SET name = $1, description = $2, station_id = $3, category = $4, image_url = $5, "opening_hours" = $6, travelinfo = $7, phone = $8, location = $9, contact = $10, gallery = $11 WHERE id = $12`;
    const params = [name, description, station_id, category, imageUrl, opening_hours, travelinfo, phone, location, contact, JSON.stringify(galleryUrls), id];
    
    try {
        const result = await db.query(sql, params);
        res.json({ message: 'Place updated successfully', changes: result.rowCount });
    } catch (err) {
        console.error('Error on PUT /api/places/:id:', err);
        res.status(400).json({ error: err.message });
    }
});


// DELETE a place
app.delete('/api/places/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('BEGIN');
        await db.query('DELETE FROM reviews WHERE place_id = $1', [id]);
        await db.query('DELETE FROM events WHERE place_id = $1', [id]);
        const result = await db.query('DELETE FROM places WHERE id = $1', [id]);
        await db.query('COMMIT');
        res.json({ message: 'Place deleted successfully', changes: result.rowCount });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// --- Events CRUD ---
app.get('/api/events', async (req, res) => {
    const sql = `
        SELECT
            e.id, e.place_id, e.event_date, e.title, e.description,
            p.name as "placeName", p.station_id
        FROM events e
        LEFT JOIN places p ON e.place_id = p.id
        ORDER BY e.event_date DESC
    `;
    try {
        const result = await db.query(sql);
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": err.message });
    }
});

app.post('/api/events/add', async (req, res) => {
    const { place_id, event_date, title, description } = req.body;
    if (!place_id || !event_date || !title) {
        return res.status(400).json({ error: "Missing required fields for event." });
    }
    const sql = `INSERT INTO events (place_id, event_date, title, description) VALUES ($1, $2, $3, $4) RETURNING id`;
    try {
        const result = await db.query(sql, [place_id, event_date, title, description]);
        res.status(201).json({ message: 'Event added successfully', id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    const { place_id, event_date, title, description } = req.body;
    const sql = `UPDATE events SET place_id = $1, event_date = $2, title = $3, description = $4 WHERE id = $5`;
    try {
        const result = await db.query(sql, [place_id, event_date, title, description, id]);
        res.json({ message: 'Event updated successfully', changes: result.rowCount });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM events WHERE id = $1', [id]);
        res.json({ message: 'Event deleted successfully', changes: result.rowCount });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// --- Reviews Management ---
app.get('/api/reviews/place/:place_id', async (req, res) => {
    const { place_id } = req.params;
    try {
        const result = await db.query("SELECT * FROM reviews WHERE place_id = $1 ORDER BY id DESC", [place_id]);
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM reviews WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Review not found' });
        res.json({ message: 'Review deleted successfully', changes: result.rowCount });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// --- Main App Endpoints ---
app.get('/api/stations', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM stations");
        const sortedRows = result.rows.sort((a, b) => {
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
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message });
    }
});

app.get('/api/places/:station_id', async (req, res) => {
    const stationId = req.params.station_id;
    const sql = `
      SELECT 
        p.*, 
        (SELECT AVG(r.rating) FROM reviews r WHERE r.place_id = p.id) as average_rating, 
        (SELECT COUNT(r.id) FROM reviews r WHERE r.place_id = p.id) as review_count,
        (
            SELECT json_agg(json_build_object('user', rev.user, 'rating', rev.rating, 'comment', rev.comment))
            FROM (
                SELECT *
                FROM reviews rev
                WHERE rev.place_id = p.id
                ORDER BY rev.id DESC
            ) as rev
        ) as reviews
      FROM places p
      WHERE p.station_id = $1
    `;
    try {
        const result = await db.query(sql, [stationId]);
        const processedRows = result.rows.map(row => ({
            ...row,
            reviews: row.reviews || [],
            gallery: row.gallery || [],
            location: row.location || null,
            contact: row.contact || {},
        }));
        res.json({ "message": "success", "data": processedRows });
    } catch (err) {
        console.error(`Database error for station ${stationId}:`, err);
        res.status(400).json({ "error": err.message });
    }
});

app.post('/api/places/:placeId/reviews', async (req, res) => {
    const placeId = req.params.placeId;
    const { user, rating, comment } = req.body;
    const sql = `INSERT INTO reviews (place_id, "user", rating, comment) VALUES ($1, $2, $3, $4) RETURNING id`;
    try {
        const result = await db.query(sql, [placeId, user, rating, comment]);
        // Emit event after successfully adding a review
        io.emit('review_updated', { placeId });
        res.json({ "message": "Review added successfully", "id": result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message });
    }
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

