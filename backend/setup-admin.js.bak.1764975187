/* creates initial admin in data/db.json */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ admins:[], users:[], attendance:[] }, null, 2), 'utf8');

const email = process.argv[2] || 'admin@rumahsakit.or.id';
const pass = process.argv[3] || 'admin12345';
const name = process.argv[4] || 'Admin Utama';

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
if(db.admins.find(a => a.email === email)){ console.log('Admin sudah ada:', email); process.exit(0); }

const id = 'adm_' + nanoid(8);
const hash = bcrypt.hashSync(pass, 10);
db.admins.push({ id, email, name, password_hash: hash, created_at: new Date().toISOString() });
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log('Admin dibuat:', email, ' password:', pass);
