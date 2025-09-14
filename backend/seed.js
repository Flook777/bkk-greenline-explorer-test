const fs = require('fs');
const path = require('path');

function seedDatabase(db) {
  const dataPath = path.join(__dirname, 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  db.serialize(() => {
    // Drop existing tables to start fresh
    db.run(`DROP TABLE IF EXISTS stations`);
    db.run(`DROP TABLE IF EXISTS places`);
    // **จุดที่แก้ไข:** เพิ่มการลบตาราง reviews เดิม (ถ้ามี)
    db.run(`DROP TABLE IF EXISTS reviews`);

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
        events TEXT,
        FOREIGN KEY (station_id) REFERENCES stations (id)
    )`);

    // **จุดที่แก้ไข:** เพิ่มการสร้างตาราง reviews ที่ขาดหายไป
    db.run(`CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER,
        user TEXT,
        rating INTEGER,
        comment TEXT,
        FOREIGN KEY (place_id) REFERENCES places (id)
    )`);

    // Insert data
    const stationStmt = db.prepare("INSERT INTO stations (id, name) VALUES (?, ?)");
    data.stations.forEach(station => {
        stationStmt.run(station.id, station.name);
    });
    stationStmt.finalize();

    const placeStmt = db.prepare(`INSERT INTO places (
        station_id, name, category, description, image, gallery, 
        openingHours, travelInfo, phone, contact, location, events
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    data.places.forEach(place => {
        placeStmt.run(
            place.station_id, place.name, place.category, place.description,
            place.image, JSON.stringify(place.gallery), place.openingHours,
            place.travelInfo, place.phone, JSON.stringify(place.contact),
            JSON.stringify(place.location), JSON.stringify(place.events)
        );
    });
    placeStmt.finalize();

    console.log('Database seeded successfully with all tables.');
  });
}

module.exports = seedDatabase;
