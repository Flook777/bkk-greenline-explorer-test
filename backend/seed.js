const fs = require('fs');
const path = require('path');

function seedDatabase(db) {
  const dataPath = path.join(__dirname, 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  db.serialize(() => {
    // Drop existing tables to start fresh
    db.run(`DROP TABLE IF EXISTS events`);
    db.run(`DROP TABLE IF EXISTS reviews`);
    db.run(`DROP TABLE IF EXISTS places`);
    db.run(`DROP TABLE IF EXISTS stations`);

    // Create tables
    db.run(`CREATE TABLE stations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        image TEXT,
        gallery TEXT,
        openingHours TEXT,
        travelInfo TEXT,
        phone TEXT,
        contact TEXT,
        location TEXT,
        FOREIGN KEY (station_id) REFERENCES stations (id)
    )`);

    db.run(`CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER,
        user TEXT,
        rating INTEGER,
        comment TEXT,
        FOREIGN KEY (place_id) REFERENCES places (id)
    )`);

    // สร้างตาราง events ที่ถูกต้อง
    db.run(`CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER NOT NULL,
        event_date TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE
    )`);

    // Insert data
    const stationStmt = db.prepare("INSERT INTO stations (id, name) VALUES (?, ?)");
    data.stations.forEach(station => {
        stationStmt.run(station.id, station.name);
    });
    stationStmt.finalize();

    const placeStmt = db.prepare(`INSERT INTO places (
        station_id, name, category, description, image, gallery, 
        openingHours, travelInfo, phone, contact, location
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    (data.places || []).forEach(place => {
        placeStmt.run(
            place.station_id, place.name, place.category, place.description,
            place.image, JSON.stringify(place.gallery), place.openingHours,
            place.travelInfo, place.phone, JSON.stringify(place.contact),
            JSON.stringify(place.location)
        );
    });
    placeStmt.finalize();

    console.log('Database seeded successfully with all tables.');
  });
}

module.exports = seedDatabase;

