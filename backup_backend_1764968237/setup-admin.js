require('dotenv').config();
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'data', 'hs.sqlite');

if(!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

try { require('./migrate.js'); } catch(e) { console.warn('migrate runner:', e.message); }

const db = new Database(DB_PATH);

async function main(){
  const email = process.argv[2] || 'admin@rumahsakit.or.id';
  const pass = process.argv[3] || 'admin12345';
  const name = process.argv[4] || 'Admin Utama';

  const exists = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if(exists){ console.log('Admin sudah ada:', email); db.close(); return; }

  const hash = await bcrypt.hash(pass, 10);
  const id = 'adm_' + nanoid(8);
  const stmt = db.prepare('INSERT INTO admins (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)');
  stmt.run(id, email, name, hash, new Date().toISOString());
  console.log('Admin dibuat:', email, 'password:', pass);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
