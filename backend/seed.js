// seed.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// --- !! สำคัญ: แก้ไขชื่อไฟล์ .db ให้ตรงกับของคุณ !! ---
const dbPath = path.resolve(__dirname, 'bts_explorer.db'); 
const dataPath = path.resolve(__dirname, 'data.json');

// --- 1. ตรวจสอบว่าไฟล์ data.json มีอยู่จริง ---
if (!fs.existsSync(dataPath)) {
    console.error(`❌ Error: data.json not found at ${dataPath}`);
    process.exit(1); // ออกจากโปรแกรมทันที
}

// --- 2. เชื่อมต่อฐานข้อมูล ---
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error('Error connecting to database:', err.message);
    }
    console.log('✅ Connected to the SQLite database.');
    initializeDatabase();
});

// --- 3. ฟังก์ชันหลัก: สร้างตารางและใส่ข้อมูล ---
function initializeDatabase() {
    db.serialize(() => {
        // Step 1: สร้างตาราง stations (ถ้ายังไม่มี)
        db.run(`CREATE TABLE IF NOT EXISTS stations (id TEXT PRIMARY KEY, name TEXT NOT NULL)`, (err) => {
            if (err) return console.error("Error creating stations table:", err.message);
            console.log("✔️ 'stations' table is ready.");
        });

        // Step 2: สร้างตาราง places (ถ้ายังไม่มี)
        db.run(`CREATE TABLE IF NOT EXISTS places (id INTEGER PRIMARY KEY AUTOINCREMENT, station_id TEXT NOT NULL, name TEXT NOT NULL, category TEXT, description TEXT, image TEXT, gallery TEXT, openingHours TEXT, travelInfo TEXT, phone TEXT, contact TEXT, location TEXT, events TEXT, reviews TEXT, FOREIGN KEY (station_id) REFERENCES stations (id))`, (err) => {
            if (err) return console.error("Error creating places table:", err.message);
            console.log("✔️ 'places' table is ready.");
        });

        // Step 3: เริ่มใส่ข้อมูล (หลังจากมั่นใจว่าตารางพร้อมแล้ว)
        // ใช้ setTimeout เพื่อให้แน่ใจว่าคำสั่งสร้างตารางทำงานเสร็จก่อน
        setTimeout(() => {
            seedData();
        }, 500); // หน่วงเวลาเล็กน้อย
    });
}

// --- 4. ฟังก์ชันสำหรับอ่านและใส่ข้อมูล ---
function seedData() {
    let places;
    try {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        if (rawData.trim() === '') {
            console.error('❌ Error: data.json is empty.');
            db.close();
            return;
        }
        places = JSON.parse(rawData);
    } catch (err) {
        console.error('❌ Error reading or parsing data.json:', err.message);
        db.close();
        return;
    }

    const insertSql = `INSERT INTO places (station_id, name, category, description, image, gallery, openingHours, travelInfo, phone, contact, location, events, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.serialize(() => {
        db.run('DELETE FROM places', (err) => {
            if (err) return console.error('Error clearing table:', err.message);
            console.log('🧹 Old data in "places" table cleared.');
        });

        console.log('🌱 Starting to insert new data...');
        const stmt = db.prepare(insertSql);
        places.forEach((place) => {
            stmt.run(
                place.station_id, place.name, place.category, place.description, place.image, 
                place.gallery, place.openingHours, place.travelInfo, place.phone, 
                place.contact, place.location, place.events, place.reviews
            );
        });
        
        stmt.finalize((err) => {
            if (err) return console.error('Error finalizing statement:', err.message);
            console.log(`🎉 Successfully inserted ${places.length} records into the 'places' table.`);
            
            db.close((err) => {
                if (err) return console.error('Error closing database:', err.message);
                console.log('🔒 Closed the database connection.');
            });
        });
    });
}
