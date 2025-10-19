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
        console.log('Connected to the database.');
    }
});


// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/images';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// --- API Endpoints ---

// Get all stations
app.get('/api/stations', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM stations ORDER BY id');
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// Get all places or places for a specific station
app.get('/api/places', async (req, res) => {
    const { stationId } = req.query;
    try {
        let result;
        if (stationId) {
            result = await db.query('SELECT * FROM places WHERE station_id = $1', [stationId]);
        } else {
            result = await db.query('SELECT * FROM places');
        }
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// Add a new place
app.post('/api/places', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
    try {
        const {
            name, description, station_id, category, opening_hours,
            travelinfo, phone, latitude, longitude, contact, gallery: galleryUrls // Corrected to travelinfo
        } = req.body;

        const imageUrl = req.files.image ? `${process.env.BACKEND_URL}/images/${req.files.image[0].filename}` : null;
        
        const galleryImageUrls = req.files.gallery 
            ? req.files.gallery.map(file => `${process.env.BACKEND_URL}/images/${file.filename}`)
            : (galleryUrls ? JSON.parse(galleryUrls) : []);
            
        const location = (latitude && longitude) ? JSON.stringify({ lat: parseFloat(latitude), lng: parseFloat(longitude) }) : null;
        const parsedContact = contact ? JSON.parse(contact) : {};
        
        const sql = `INSERT INTO places (name, description, station_id, category, image_url, opening_hours, travelinfo, phone, location, contact, gallery) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
        const params = [
            name, description, station_id, category, imageUrl, opening_hours,
            travelinfo, phone, location, parsedContact, galleryImageUrls // Corrected to travelinfo
        ];
        
        const result = await db.query(sql, params);
        res.status(201).json({ "message": "Place added successfully", "data": result.rows[0] });

    } catch (err) {
        console.error('Error adding place:', err);
        res.status(400).json({ "error": err.message });
    }
});

// Update a place
app.put('/api/places/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
    const { id } = req.params;
    try {
        const {
            name, description, station_id, category, opening_hours,
            travelinfo, phone, latitude, longitude, contact, gallery: galleryUrls, image // Corrected to travelinfo
        } = req.body;
        
        let imageUrl = image; // Keep existing one by default
        if(req.files.image) {
            imageUrl = `${process.env.BACKEND_URL}/images/${req.files.image[0].filename}`;
        }
        
        const galleryImageUrls = req.files.gallery 
            ? req.files.gallery.map(file => `${process.env.BACKEND_URL}/images/${file.filename}`)
            : (galleryUrls ? JSON.parse(galleryUrls) : []);

        const location = (latitude && longitude) ? JSON.stringify({ lat: parseFloat(latitude), lng: parseFloat(longitude) }) : null;
        const parsedContact = contact ? JSON.parse(contact) : {};

        const sql = `UPDATE places SET name = $1, description = $2, station_id = $3, category = $4, image_url = $5, opening_hours = $6, travelinfo = $7, phone = $8, location = $9, contact = $10, gallery = $11 WHERE id = $12 RETURNING *`;
        const params = [
            name, description, station_id, category, imageUrl, opening_hours,
            travelinfo, phone, location, parsedContact, galleryImageUrls, id // Corrected to travelinfo
        ];

        const result = await db.query(sql, params);
        res.json({ "message": "Place updated successfully", "data": result.rows[0] });

    } catch (err) {
        console.error('Error updating place:', err);
        res.status(400).json({ "error": err.message });
    }
});


// Delete a place
app.delete('/api/places/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM places WHERE id = $1', [req.params.id]);
        res.json({ message: 'Place deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get reviews for a place
app.get('/api/places/:placeId/reviews', async (req, res) => {
    try {
        const { placeId } = req.params;
        const result = await db.query('SELECT * FROM reviews WHERE place_id = $1 ORDER BY created_at DESC', [placeId]);
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// Add a new review
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


// --- Socket.IO Connection ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- Server Listening ---
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

