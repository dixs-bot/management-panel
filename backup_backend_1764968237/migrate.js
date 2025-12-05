const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'data', 'hs.sqlite');
const SQL = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');

const dbDir = path.dirname(DB_PATH);
if(!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.exec(SQL);
console.log('Migration applied to', DB_PATH);
db.close();
