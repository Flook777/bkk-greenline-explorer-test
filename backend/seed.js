const fs = require('fs');
const path = require('path');

async function seedDatabase(db) {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log('Dropping existing tables...');
    await db.query(`
        DROP TABLE IF EXISTS events;
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS places;
        DROP TABLE IF EXISTS stations;
    `);

    console.log('Creating tables...');
    // ใช้ SERIAL PRIMARY KEY สำหรับ auto-incrementing ID ใน PostgreSQL
    // ใช้ JSONB สำหรับเก็บข้อมูล JSON
    // ใช้ Double quotes (") สำหรับชื่อคอลัมน์ที่เป็น CamelCase เช่น "openingHours"
    await db.query(`
        CREATE TABLE stations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );
    `);
    await db.query(`
        CREATE TABLE places (
            id SERIAL PRIMARY KEY,
            station_id TEXT REFERENCES stations(id),
            name TEXT NOT NULL,
            category TEXT,
            description TEXT,
            image TEXT,
            gallery JSONB,
            "openingHours" TEXT,
            "travelInfo" TEXT,
            phone TEXT,
            contact JSONB,
            location JSONB
        );
    `);
    await db.query(`
        CREATE TABLE reviews (
            id SERIAL PRIMARY KEY,
            place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
            "user" TEXT,
            rating INTEGER,
            comment TEXT
        );
    `);
    await db.query(`
        CREATE TABLE events (
            id SERIAL PRIMARY KEY,
            place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
            event_date DATE NOT NULL,
            title TEXT NOT NULL,
            description TEXT
        );
    `);

    console.log('Inserting data into stations...');
    for (const station of data.stations) {
        await db.query("INSERT INTO stations (id, name) VALUES ($1, $2)", [station.id, station.name]);
    }

    console.log('Inserting data into places...');
    for (const place of (data.places || [])) {
        await db.query(
            `INSERT INTO places (station_id, name, category, description, image, gallery, "openingHours", "travelInfo", phone, contact, location) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                place.station_id,
                place.name,
                place.category,
                place.description,
                place.image,
                JSON.stringify(place.gallery || []),
                place.openingHours,
                place.travelInfo,
                place.phone,
                JSON.stringify(place.contact || {}),
                JSON.stringify(place.location || null)
            ]
        );
    }

    console.log('Database seeded successfully with all tables.');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = seedDatabase;