const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const multer = require('multer');
const fs = require('fs');
const seedDatabase = require('./seed'); // Import seed function

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
const vercelFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsOptions = {
    origin: [
        vercelFrontendUrl, 
        'http://localhost:3000',
        'https://bkk-greenline-explorer-test.vercel.app' // เพิ่มโดเมน Vercel ของคุณโดยตรง
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true // จำเป็นสำหรับ Socket.IO และการส่ง Cookie/Session ข้ามโดเมน
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

// Updated: Auto-seed logic on connection
db.connect(async (err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to the PostgreSQL database.');
        
        // Check if 'stations' table exists and has data
        try {
            const tableCheck = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'stations'
                );
            `);
            
            const tableExists = tableCheck.rows[0].exists;

            if (!tableExists) {
                console.log('Stations table not found. Seeding database...');
                await seedDatabase(db);
            } else {
                const countResult = await db.query('SELECT count(*) FROM stations');
                if (parseInt(countResult.rows[0].count) === 0) {
                    console.log('Database tables exist but are empty. Seeding data...');
                    await seedDatabase(db);
                } else {
                    console.log('Database already contains data. Skipping seed.');
                }
            }
        } catch (seedErr) {
            console.error('Error checking/seeding database:', seedErr);
        }
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
        // Select using snake_case columns
        const result = await db.query("SELECT * FROM places ORDER BY name");
        
        // Map back to CamelCase for Frontend compatibility
        const processedRows = result.rows.map(row => ({
            ...row,
            openingHours: row.opening_hours, // Map DB snake_case to Frontend camelCase
            travelInfo: row.travel_info,     // Map DB snake_case to Frontend camelCase
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
    console.log("Received body for ADD:", req.body);

    const { name, description, station_id, category, openingHours, phone, latitude, longitude, contact } = req.body;
    
    // Map frontend fields to DB fields
    const opening_hours = openingHours;
    const travel_info = req.body.travelInfo || req.body.travelinfo || ''; 

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
    
    // SQL uses snake_case columns without quotes
    const sql = `
        INSERT INTO places (
            name, description, station_id, category, image, 
            opening_hours, travel_info, phone, location, contact, gallery
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING id
    `;
    
    const params = [
        name, description, station_id, category, imageUrl, 
        opening_hours, travel_info, phone, location, contact, JSON.stringify(galleryUrls)
    ];
    
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
    console.log("Received body for UPDATE:", req.body);
    
    const { id } = req.params;
    const { name, description, station_id, category, openingHours, phone, latitude, longitude, contact, image } = req.body;
    
    const opening_hours = openingHours;
    const travel_info = req.body.travelInfo || req.body.travelinfo || '';

    let imageUrl = image; // Keep old image if no new one is uploaded
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

    // Update SQL using snake_case columns
    const sql = `
        UPDATE places 
        SET name = $1, description = $2, station_id = $3, category = $4, image = $5, 
            opening_hours = $6, travel_info = $7, phone = $8, location = $9, contact = $10, gallery = $11 
        WHERE id = $12
    `;
    
    const params = [
        name, description, station_id, category, imageUrl, 
        opening_hours, travel_info, phone, location, contact, JSON.stringify(galleryUrls), id
    ];
    
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
    // Select using snake_case columns
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
            openingHours: row.opening_hours, // Map back for Frontend
            travelInfo: row.travel_info,     // Map back for Frontend
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
        io.emit('review_updated', { placeId });
        res.json({ "message": "Review added successfully", "id": result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message });
    }
});

// --- Helper route for uploading gallery manually (used by PlaceForm) ---
app.post('/api/upload-gallery', upload.array('galleryImages', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const imageUrls = req.files.map(file => `${backendUrl}/images/${file.filename}`);
    res.json({ imageUrls });
});

// --- Helper route for single image upload ---
app.post('/api/upload', upload.single('placeImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const imageUrl = `${backendUrl}/images/${req.file.filename}`;
    res.json({ imageUrl });
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