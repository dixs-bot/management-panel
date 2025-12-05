/*
  server-jsondb.js (patched) — uses a small internal CSV builder to avoid package export issues
  Backend using a single JSON file as storage (data/db.json).
*/
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const PORT = process.env.PORT || 4001;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// initialise DB file if not exists
if(!fs.existsSync(DB_FILE)){
  const initial = { admins: [], users: [], attendance: [] };
  fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
}

function readDB(){
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){ return { admins:[], users:[], attendance:[] }; }
}
function writeDB(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15*60*1000, max: 500 }));

function errorResponse(res, status=500, code='INTERNAL', message='Terjadi kesalahan server.', fields=null){
  const requestId = 'req_' + nanoid(8);
  res.status(status).json({ error: { code, message, fields, requestId }});
}

/* small CSV builder to avoid external dependency */
function esc(val){
  if(val === null || val === undefined) return '';
  const s = String(val);
  if(s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}
function buildCSV(headerArray, recordsArray){
  const lines = [];
  lines.push(headerArray.map(esc).join(','));
  for(const row of recordsArray){
    lines.push(row.map(esc).join(','));
  }
  return lines.join('\n');
}

/* Auth helpers */
function signToken(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES }); }
function verifyToken(token){ try { return jwt.verify(token, JWT_SECRET); } catch(e) { return null; } }

function requireAuth(req, res, next){
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Token tidak ditemukan.');
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if(!payload) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Token tidak valid atau kadaluarsa.');
  req.auth = payload;
  next();
}
function requireAdmin(req, res, next){
  if(!req.auth) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Login diperlukan.');
  if(req.auth.role !== 'admin') return errorResponse(res, 403, 'FORBIDDEN', 'Hanya admin yang dapat mengakses resource ini.');
  next();
}

/* Schemas */
const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().allow('', null),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('staff','doctor','admin').required(),
  department: Joi.string().allow('', null),
  position: Joi.string().allow('', null),
  dob: Joi.string().allow('', null),
  employmentDate: Joi.string().allow('', null),
  gender: Joi.string().allow('', null),
  education: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  nip: Joi.string().allow('', null)
});
const updateUserSchema = Joi.object({
  name: Joi.string().allow('', null),
  role: Joi.string().valid('staff','doctor','admin'),
  active: Joi.boolean(),
  department: Joi.string().allow('', null),
  position: Joi.string().allow('', null),
  dob: Joi.string().allow('', null),
  employmentDate: Joi.string().allow('', null),
  gender: Joi.string().allow('', null),
  education: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  nip: Joi.string().allow('', null)
});
const changePwdSchema = Joi.object({ newPassword: Joi.string().min(6).required() });
const attendanceSchema = Joi.object({
  type: Joi.string().valid('in','out').optional(),
  status: Joi.string().valid('in','out','sick','leave','permission').required(),
  reason: Joi.string().allow('', null).optional(),
  userId: Joi.string().optional(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fromDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: Joi.string().isoDate().optional()
});

function parseDateISO(d){
  if(!d) return null;
  const m = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T08:00:00Z') : new Date(d);
  return isNaN(m.getTime()) ? null : m;
}
function datesBetween(startDate, endDate){
  const a = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const b = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const res = [];
  for(let d = new Date(a); d <= b; d.setDate(d.getDate()+1)){
    res.push(new Date(d));
  }
  return res;
}
function toISODateTimeUTC(d){
  if(!d) return new Date().toISOString();
  return new Date(d).toISOString();
}

/* Utility DB helpers using JSON file */
function findAdminByEmail(email){
  const db = readDB();
  return db.admins.find(a => a.email.toLowerCase() === (email||'').toLowerCase());
}
function findUserByEmail(email){
  const db = readDB();
  return db.users.find(u => u.email.toLowerCase() === (email||'').toLowerCase());
}
function findUserById(id){
  const db = readDB();
  return db.users.find(u => u.id === id) || db.admins.find(a => a.id === id) || null;
}

/* Endpoints */

/* LOGIN */
app.post('/auth/login', (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data login tidak valid.');
  const { email, password } = value;
  try {
    const admin = findAdminByEmail(email);
    if(admin){
      const ok = bcrypt.compareSync(password, admin.password_hash);
      if(!ok) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');
      const token = signToken({ id: admin.id, email: admin.email, role: 'admin' });
      return res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: 'admin' }});
    }
    const user = findUserByEmail(email);
    if(user){
      const ok = bcrypt.compareSync(password, user.password_hash);
      if(!ok) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');
      if(user.active === false) return errorResponse(res, 403, 'FORBIDDEN', 'Akun dinonaktifkan.');
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }});
    }
    return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');
  } catch(e){ console.error(e); return errorResponse(res); }
});

app.get('/auth/me', requireAuth, (req, res) => {
  const me = findUserById(req.auth.id);
  if(!me) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
  const out = { id: me.id, email: me.email, name: me.name, role: me.role || 'admin' };
  res.json(out);
});

/* ADMIN STATS */
app.get('/admin/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = readDB();
    const totalUsers = db.users.length;
    const totalAdmins = db.admins.length;
    const today = new Date().toISOString().slice(0,10);
    const attendanceToday = db.attendance.filter(a => a.time && a.time.startsWith(today)).length;
    res.json({ totalUsers, totalAdmins, attendanceToday });
  } catch(e){ console.error(e); errorResponse(res); }
});

/* USERS */
app.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const per_page = Math.max(1, parseInt(req.query.per_page || '200'));
    const searchTerm = req.query.search ? (req.query.search.toLowerCase()) : '';
    const db = readDB();
    let list = db.users;
    if(searchTerm) list = list.filter(u => (u.email||'').toLowerCase().includes(searchTerm) || (u.name||'').toLowerCase().includes(searchTerm));
    const total = list.length;
    const offset = (page-1)*per_page;
    const data = list.slice(offset, offset+per_page).map(u => ({ id:u.id, email:u.email, name:u.name, role:u.role, active: u.active !== false, department:u.department, position:u.position }));
    res.json({ meta: { page, per_page, total }, data });
  } catch(e){ console.error(e); errorResponse(res); }
});

app.post('/admin/users', requireAuth, requireAdmin, (req, res) => {
  const { error, value } = createUserSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const db = readDB();
  if(findUserByEmail(value.email) || findAdminByEmail(value.email)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Email sudah dipakai.');
  const id = 'u_' + nanoid(8);
  const hash = bcrypt.hashSync(value.password, 10);
  const user = {
    id, email: value.email, name: value.name||'', role: value.role||'staff',
    password_hash: hash, active: true, created_at: new Date().toISOString(),
    department: value.department||'', position: value.position||'', dob: value.dob||null,
    employmentDate: value.employmentDate||null, gender: value.gender||null,
    education: value.education||'', phone: value.phone||'', address: value.address||'', nip: value.nip||''
  };
  db.users.push(user);
  writeDB(db);
  res.status(201).json({ id, email: user.email, name: user.name, role: user.role, active: true });
});

app.put('/admin/users/:userId', requireAuth, requireAdmin, (req, res) => {
  const { error, value } = updateUserSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const uid = req.params.userId;
  const db = readDB();
  const u = db.users.find(x => x.id === uid);
  if(!u) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
  u.name = value.name ?? u.name;
  u.role = value.role ?? u.role;
  if(value.active !== undefined) u.active = value.active;
  u.department = value.department ?? u.department;
  u.position = value.position ?? u.position;
  u.dob = value.dob ?? u.dob;
  u.employmentDate = value.employmentDate ?? u.employmentDate;
  u.gender = value.gender ?? u.gender;
  u.education = value.education ?? u.education;
  u.phone = value.phone ?? u.phone;
  u.address = value.address ?? u.address;
  u.nip = value.nip ?? u.nip;
  writeDB(db);
  res.json({ id: u.id, email: u.email, name: u.name, role: u.role, active: !!u.active });
});

app.put('/admin/users/:userId/password', requireAuth, requireAdmin, (req, res) => {
  const { error, value } = changePwdSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const uid = req.params.userId;
  const db = readDB();
  const u = db.users.find(x => x.id === uid);
  if(!u) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
  const newHash = bcrypt.hashSync(value.newPassword, 10);
  u.password_hash = newHash;
  writeDB(db);
  res.json({ message: 'Password diperbarui' });
});

/* ADMINS */
app.get('/admin/admins', requireAuth, requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.admins.map(a => ({ id:a.id, email:a.email, name:a.name })));
});

app.post('/admin/admins', requireAuth, requireAdmin, (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), name: Joi.string().allow('', null), password: Joi.string().min(6).required() });
  const { error, value } = schema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const db = readDB();
  if(findAdminByEmail(value.email) || findUserByEmail(value.email)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Email sudah dipakai.');
  const id = 'adm_' + nanoid(8);
  const hash = bcrypt.hashSync(value.password, 10);
  db.admins.push({ id, email: value.email, name: value.name||'', password_hash: hash, created_at: new Date().toISOString()});
  writeDB(db);
  res.status(201).json({ id, email: value.email, name: value.name||'', role: 'admin' });
});

app.put('/admin/admins/:adminId/password', requireAuth, requireAdmin, (req, res) => {
  const { error, value } = changePwdSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const aid = req.params.adminId;
  const db = readDB();
  const a = db.admins.find(x => x.id === aid);
  if(!a) return errorResponse(res, 404, 'NOT_FOUND', 'Admin tidak ditemukan.');
  a.password_hash = bcrypt.hashSync(value.newPassword, 10);
  writeDB(db);
  res.json({ message: 'Password diperbarui' });
});

/* ATTENDANCE */
const allowedStatuses = ['in','out','sick','leave','permission'];

app.post('/attendance', requireAuth, (req, res) => {
  const { error, value } = attendanceSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid attendance payload.');
  try {
    const status = value.status;
    if(!allowedStatuses.includes(status)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Status tidak valid.');
    const userId = value.userId || req.auth.id;
    const db = readDB();
    let row = db.users.find(u => u.id === userId);
    if(!row) row = db.admins.find(a => a.id === userId);
    if(!row) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
    const userName = row.name || row.email;
    const reason = value.reason || null;

    // exact time
    if(value.time){
      const t = parseDateISO(value.time);
      if(!t) return errorResponse(res, 400, 'VALIDATION_ERROR', 'time tidak valid (ISO).');
      const id = 'att_' + nanoid(8);
      const entry = { id, user_id: row.id, user_name: userName, type: value.type || null, status, reason: reason || null, time: toISODateTimeUTC(t) };
      db.attendance.push(entry); writeDB(db);
      return res.status(201).json(entry);
    }

    // range
    if(value.fromDate && value.toDate){
      const from = parseDateISO(value.fromDate);
      const to = parseDateISO(value.toDate);
      if(!from || !to) return errorResponse(res, 400, 'VALIDATION_ERROR', 'fromDate/toDate tidak valid.');
      if(from > to) return errorResponse(res, 400, 'VALIDATION_ERROR', 'fromDate tidak boleh setelah toDate.');
      const dates = datesBetween(from, to);
      const created = [];
      for(const d of dates){
        const id = 'att_' + nanoid(8);
        const entry = { id, user_id: row.id, user_name: userName, type: null, status, reason: reason || null, time: toISODateTimeUTC(d) };
        db.attendance.push(entry);
        created.push(entry);
      }
      writeDB(db);
      return res.status(201).json({ message: 'Entries created', created });
    }

    // single date
    if(value.date){
      const d = parseDateISO(value.date);
      if(!d) return errorResponse(res, 400, 'VALIDATION_ERROR', 'date tidak valid.');
      const id = 'att_' + nanoid(8);
      const entry = { id, user_id: row.id, user_name: userName, type: value.type || null, status, reason: reason || null, time: toISODateTimeUTC(d) };
      db.attendance.push(entry); writeDB(db);
      return res.status(201).json(entry);
    }

    // now
    const id = 'att_' + nanoid(8);
    const entry = { id, user_id: row.id, user_name: userName, type: value.type || null, status, reason: reason || null, time: new Date().toISOString() };
    db.attendance.push(entry); writeDB(db);
    return res.status(201).json(entry);

  } catch(e){ console.error(e); return errorResponse(res, 500, 'INTERNAL', 'Gagal menyimpan absensi.'); }
});

app.get('/attendance', requireAuth, (req, res) => {
  try {
    const todayOnly = req.query.today === 'true' || req.query.today === '1';
    const db = readDB();
    if(todayOnly){
      const today = new Date().toISOString().slice(0,10);
      const rows = db.attendance.filter(a => a.time && a.time.startsWith(today)).sort((a,b)=> b.time.localeCompare(a.time));
      return res.json(rows);
    }
    const rows = db.attendance.slice().sort((a,b)=> b.time.localeCompare(a.time)).slice(0,500);
    res.json(rows);
  } catch(e){ console.error(e); errorResponse(res); }
});

/* SUMMARY + CSV */
app.get('/admin/attendance/summary', requireAuth, requireAdmin, (req, res) => {
  try {
    const month = req.query.month;
    if(!month || !/^\d{4}-\d{2}$/.test(month)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Parameter month harus YYYY-MM.');
    const db = readDB();
    const monthPrefix = month;
    const rowsMap = {};
    for(const a of db.attendance){
      if(!a.time) continue;
      if(a.time.slice(0,7) !== monthPrefix) continue;
      const uid = a.user_id;
      if(!rowsMap[uid]) rowsMap[uid] = { userId: uid, userName: a.user_name, inCount:0, outCount:0, sickCount:0, leaveCount:0, permissionCount:0, totalRecords:0, datesPresent: new Set() };
      const r = rowsMap[uid];
      if(a.status === 'in') r.inCount++;
      if(a.status === 'out') r.outCount++;
      if(a.status === 'sick') r.sickCount++;
      if(a.status === 'leave') r.leaveCount++;
      if(a.status === 'permission') r.permissionCount++;
      r.totalRecords++;
      const datePart = a.time.slice(0,10);
      if(['in','out'].includes(a.status)) r.datesPresent.add(datePart);
    }
    const out = Object.values(rowsMap).map(r => ({
      userId: r.userId,
      userName: r.userName,
      presentDays: r.datesPresent.size,
      inCount: r.inCount,
      outCount: r.outCount,
      sickCount: r.sickCount,
      leaveCount: r.leaveCount,
      permissionCount: r.permissionCount,
      totalRecords: r.totalRecords
    }));
    res.json(out);
  } catch(e){ console.error(e); errorResponse(res); }
});

app.get('/admin/attendance/summary.csv', requireAuth, requireAdmin, (req, res) => {
  try {
    const month = req.query.month;
    if(!month || !/^\d{4}-\d{2}$/.test(month)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Parameter month harus YYYY-MM.');
    const db = readDB();
    const monthPrefix = month;
    const rowsMap = {};
    for(const a of db.attendance){
      if(!a.time) continue;
      if(a.time.slice(0,7) !== monthPrefix) continue;
      const uid = a.user_id;
      if(!rowsMap[uid]) rowsMap[uid] = { userId: uid, userName: a.user_name, inCount:0, outCount:0, sickCount:0, leaveCount:0, permissionCount:0, totalRecords:0, datesPresent: new Set() };
      const r = rowsMap[uid];
      if(a.status === 'in') r.inCount++;
      if(a.status === 'out') r.outCount++;
      if(a.status === 'sick') r.sickCount++;
      if(a.status === 'leave') r.leaveCount++;
      if(a.status === 'permission') r.permissionCount++;
      r.totalRecords++;
      const datePart = a.time.slice(0,10);
      if(['in','out'].includes(a.status)) r.datesPresent.add(datePart);
    }
    const out = Object.values(rowsMap).map(r => ({
      userId: r.userId,
      userName: r.userName,
      presentDays: r.datesPresent.size,
      inCount: r.inCount,
      outCount: r.outCount,
      sickCount: r.sickCount,
      leaveCount: r.leaveCount,
      permissionCount: r.permissionCount,
      totalRecords: r.totalRecords
    }));
    const header = ['userId','userName','presentDays','inCount','outCount','sickCount','leaveCount','permissionCount','totalRecords'];
    const records = out.map(o => [o.userId, o.userName, o.presentDays, o.inCount, o.outCount, o.sickCount, o.leaveCount, o.permissionCount, o.totalRecords]);
    const csv = buildCSV(header, records);
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-summary-${month}.csv"`);
    res.send(csv);
  } catch(e){ console.error(e); errorResponse(res); }
});

/* catch-all */
app.use((req,res) => errorResponse(res, 404, 'NOT_FOUND', 'Endpoint tidak ditemukan.'));

app.listen(PORT, () => console.log(`HealthStation JSON-DB server listening on ${PORT}, DB: ${DB_FILE}`));
