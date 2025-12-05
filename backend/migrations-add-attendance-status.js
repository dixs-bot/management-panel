const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'data', 'hs.sqlite');

if(!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

function hasColumn(table, column){
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

try{
  if(!hasColumn('attendance','status')){
    console.log('Adding column attendance.status');
    db.exec("ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'in'");
  } else console.log('Column attendance.status already exists');

  if(!hasColumn('attendance','reason')){
    console.log('Adding column attendance.reason');
    db.exec("ALTER TABLE attendance ADD COLUMN reason TEXT");
  } else console.log('Column attendance.reason already exists');

  console.log('Migration (attendance status) finished.');
} catch(err){
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  db.close();
}
