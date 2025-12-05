/* server-sqlite.js (full feature) */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const Joi = require('joi');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 4001;
const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'data', 'hs.sqlite');
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

if(!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

try { require('./migrate.js'); } catch(e){ console.warn('migrate error (continuing):', e.message); }
try { require('./migrations-add-attendance-status.js'); } catch(e){ /* ignore */ }

const db = new Database(DB_PATH);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 500 });
app.use(limiter);

function parseDateISO(d){ if(!d) return null; const m = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T08:00:00Z') : new Date(d); return isNaN(m.getTime()) ? null : m; }
function datesBetween(startDate, endDate){ const a = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()); const b = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()); const res = []; for(let d = new Date(a); d <= b; d.setDate(d.getDate()+1)){ res.push(new Date(d)); } return res; }
function toISODateTimeUTC(d){ if(!d) return new Date().toISOString(); return new Date(d).toISOString(); }

function errorResponse(res, status=500, code='INTERNAL', message='Terjadi kesalahan server.', fields=null){ const requestId = 'req_' + nanoid(8); res.status(status).json({ error: { code, message, details: null, fields, requestId }}); }

function requireAuth(req, res, next){ const auth = req.headers.authorization; if(!auth || !auth.startsWith('Bearer ')) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Token tidak ditemukan.'); const token = auth.slice(7); try { const payload = jwt.verify(token, JWT_SECRET); req.auth = payload; next(); } catch (e) { return errorResponse(res, 401, 'UNAUTHENTICATED', 'Token tidak valid atau kadaluarsa.'); } }
function requireAdmin(req, res, next){ if(!req.auth) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Login diperlukan.'); if(req.auth.role !== 'admin') return errorResponse(res, 403, 'FORBIDDEN', 'Hanya admin yang dapat mengakses resource ini.'); next(); }

const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
const createUserSchema = Joi.object({ email: Joi.string().email().required(), name: Joi.string().allow('', null), password: Joi.string().min(6).required(), role: Joi.string().valid('staff','doctor','admin').required(), department: Joi.string().allow('', null), position: Joi.string().allow('', null), dob: Joi.string().allow('', null), employmentDate: Joi.string().allow('', null), gender: Joi.string().allow('', null), education: Joi.string().allow('', null), phone: Joi.string().allow('', null), address: Joi.string().allow('', null), nip: Joi.string().allow('', null) });
const updateUserSchema = Joi.object({ name: Joi.string().allow('', null), role: Joi.string().valid('staff','doctor','admin'), active: Joi.boolean(), department: Joi.string().allow('', null), position: Joi.string().allow('', null), dob: Joi.string().allow('', null), employmentDate: Joi.string().allow('', null), gender: Joi.string().allow('', null), education: Joi.string().allow('', null), phone: Joi.string().allow('', null), address: Joi.string().allow('', null), nip: Joi.string().allow('', null) });
const changePwdSchema = Joi.object({ newPassword: Joi.string().min(6).required() });
const attendanceSchema = Joi.object({ type: Joi.string().valid('in','out').optional(), status: Joi.string().valid('in','out','sick','leave','permission').required(), reason: Joi.string().allow('', null).optional(), userId: Joi.string().optional(), date: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/).optional(), fromDate: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/).optional(), toDate: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/).optional(), time: Joi.string().isoDate().optional() });

const getAdminByEmail = db.prepare('SELECT * FROM admins WHERE email = ? LIMIT 1');
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
const insertUser = db.prepare('INSERT INTO users (id,email,name,role,password_hash,active,created_at,department,position,dob,employmentDate,gender,education,phone,address,nip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
const insertAdmin = db.prepare('INSERT INTO admins (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
const updateUserStmt = db.prepare('UPDATE users SET name = COALESCE(?,name), role = COALESCE(?,role), active = COALESCE(?,active), department = COALESCE(?,department), position = COALESCE(?,position), dob = COALESCE(?,dob), employmentDate = COALESCE(?,employmentDate), gender = COALESCE(?,gender), education = COALESCE(?,education), phone = COALESCE(?,phone), address = COALESCE(?,address), nip = COALESCE(?,nip) WHERE id = ?');
const changeUserPwdStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
const changeAdminPwdStmt = db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
const listUsersStmt = db.prepare('SELECT id,email,name,role,active,department,position FROM users WHERE (email LIKE ? OR name LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?');
const countUsersStmt = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE (email LIKE ? OR name LIKE ?)');
const listAdminsStmt = db.prepare('SELECT id,email,name FROM admins ORDER BY created_at DESC');
const insertAttendance = db.prepare('INSERT INTO attendance (id,user_id,user_name,type,status,reason,time) VALUES (?,?,?,?,?,?,?)');

const allowedStatuses = ['in','out','sick','leave','permission'];

app.post('/auth/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data login tidak valid.');
  const { email, password } = value;
  try {
    const admin = getAdminByEmail.get(email);
    if(admin){ const ok = await bcrypt.compare(password, admin.password_hash); if(!ok) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.'); const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES }); return res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: 'admin' }}); }
    const user = getUserByEmail.get(email);
    if(user){ const ok = await bcrypt.compare(password, user.password_hash); if(!ok) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.'); if(user.active === 0) return errorResponse(res, 403, 'FORBIDDEN', 'Akun dinonaktifkan.'); const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES }); return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }}); }
    return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');
  } catch (e) { console.error(e); return errorResponse(res); }
});

app.get('/auth/me', requireAuth, (req, res) => {
  try { const id = req.auth.id; const admin = db.prepare("SELECT id,email,name,'admin' as role FROM admins WHERE id = ?").get(id); if(admin) return res.json(admin); const user = db.prepare('SELECT id,email,name,role FROM users WHERE id = ?').get(id); if(user) return res.json(user); return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.'); } catch (e) { console.error(e); return errorResponse(res); }
});

app.get('/admin/stats', requireAuth, requireAdmin, (req, res) => {
  try { const totalUsers = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt; const totalAdmins = db.prepare('SELECT COUNT(*) AS cnt FROM admins').get().cnt; const today = new Date().toISOString().slice(0,10); const attendanceToday = db.prepare("SELECT COUNT(*) AS cnt FROM attendance WHERE substr(time,1,10) = ?").get(today).cnt; res.json({ totalUsers, totalAdmins, attendanceToday }); } catch (e) { console.error(e); errorResponse(res); }
});

app.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
  try { const page = Math.max(1, parseInt(req.query.page || '1')); const per_page = Math.max(1, parseInt(req.query.per_page || '20')); const searchTerm = req.query.search ? `%${req.query.search}%` : '%'; const total = countUsersStmt.get(searchTerm, searchTerm).cnt; const offset = (page-1)*per_page; const data = listUsersStmt.all(searchTerm, searchTerm, per_page, offset); res.json({ meta: { page, per_page, total }, data }); } catch (e) { console.error(e); errorResponse(res); }
});

app.post('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { error, value } = createUserSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const { email, name, password, role, department, position, dob, employmentDate, gender, education, phone, address, nip } = value;
  try { if(getUserByEmail.get(email) || getAdminByEmail.get(email)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Email sudah dipakai.', { email: 'Email sudah dipakai' }); const hash = await bcrypt.hash(password, 10); const id = 'u_' + nanoid(8); insertUser.run(id, email, name || '', role, hash, 1, new Date().toISOString(), department || '', position || '', dob || null, employmentDate || null, gender || null, education || '', phone || '', address || '', nip || ''); res.status(201).json({ id, email, name: name || '', role, active: true }); } catch (e) { console.error(e); errorResponse(res, 500, 'INTERNAL', 'Gagal membuat user.'); }
});

app.put('/admin/users/:userId', requireAuth, requireAdmin, (req, res) => {
  const { error, value } = updateUserSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const uid = req.params.userId;
  try { const u = getUserById.get(uid); if(!u) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.'); const active = value.active === undefined ? u.active : (value.active ? 1 : 0); updateUserStmt.run(value.name, value.role, active, value.department, value.position, value.dob, value.employmentDate, value.gender, value.education, value.phone, value.address, value.nip, uid); const updated = getUserById.get(uid); res.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role, active: !!updated.active }); } catch (e) { console.error(e); errorResponse(res); }
});

app.put('/admin/users/:userId/password', requireAuth, requireAdmin, async (req, res) => {
  const { error, value } = changePwdSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.');
  const uid = req.params.userId;
  try { const u = getUserById.get(uid); if(!u) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.'); const newHash = await bcrypt.hash(value.newPassword, 10); changeUserPwdStmt.run(newHash, uid); res.json({ message: 'Password diperbarui' }); } catch (e) { console.error(e); errorResponse(res); }
});

app.get('/admin/admins', requireAuth, requireAdmin, (req, res) => { try { const rows = listAdminsStmt.all(); res.json(rows); } catch (e) { console.error(e); errorResponse(res); } });

app.post('/admin/admins', requireAuth, requireAdmin, async (req, res) => { const schema = Joi.object({ email: Joi.string().email().required(), name: Joi.string().allow('', null), password: Joi.string().min(6).required() }); const { error, value } = schema.validate(req.body); if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.'); try { if(getAdminByEmail.get(value.email) || getUserByEmail.get(value.email)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Email sudah dipakai.', { email: 'Email sudah dipakai' }); const hash = await bcrypt.hash(value.password, 10); const id = 'adm_' + nanoid(8); insertAdmin.run(id, value.email, value.name || '', hash, new Date().toISOString()); res.status(201).json({ id, email: value.email, name: value.name || '', role: 'admin' }); } catch (e) { console.error(e); errorResponse(res); } });

app.put('/admin/admins/:adminId/password', requireAuth, requireAdmin, async (req, res) => { const { error, value } = changePwdSchema.validate(req.body); if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Data tidak valid.'); const aid = req.params.adminId; try { const a = db.prepare('SELECT * FROM admins WHERE id = ?').get(aid); if(!a) return errorResponse(res, 404, 'NOT_FOUND', 'Admin tidak ditemukan.'); const h = await bcrypt.hash(value.newPassword, 10); changeAdminPwdStmt.run(h, aid); res.json({ message: 'Password diperbarui' }); } catch (e) { console.error(e); errorResponse(res); } });

app.post('/attendance', requireAuth, async (req, res) => {
  const { error, value } = attendanceSchema.validate(req.body);
  if(error) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid attendance payload.', null);
  try {
    const status = value.status;
    if(!allowedStatuses.includes(status)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Status tidak valid.');
    const userId = value.userId || req.auth.id;
    let row = db.prepare('SELECT id,name,email,role FROM users WHERE id = ?').get(userId);
    if(!row) row = db.prepare('SELECT id,name,email FROM admins WHERE id = ?').get(userId);
    if(!row) return errorResponse(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
    const userName = row.name || row.email;
    const reason = value.reason || null;
    if(value.time){
      const t = parseDateISO(value.time);
      if(!t) return errorResponse(res, 400, 'VALIDATION_ERROR', 'time tidak valid (ISO).');
      const id = 'att_' + nanoid(8);
      insertAttendance.run(id, row.id, userName, value.type || null, status, reason, toISODateTimeUTC(t));
      return res.status(201).json({ id, userId: row.id, userName, status, reason, time: toISODateTimeUTC(t) });
    }
    if(value.fromDate && value.toDate){
      const from = parseDateISO(value.fromDate);
      const to = parseDateISO(value.toDate);
      if(!from || !to) return errorResponse(res, 400, 'VALIDATION_ERROR', 'fromDate/toDate tidak valid.');
      if(from > to) return errorResponse(res, 400, 'VALIDATION_ERROR', 'fromDate tidak boleh setelah toDate.');
      const dates = datesBetween(from, to);
      const created = [];
      const insert = db.transaction((arr) => { for(const d of arr){ const id = 'att_' + nanoid(8); insertAttendance.run(id, row.id, userName, null, status, reason || null, toISODateTimeUTC(d)); created.push({ id, date: toISODateTimeUTC(d) }); } });
      insert(dates);
      return res.status(201).json({ message: 'Entries created', created });
    }
    if(value.date){
      const d = parseDateISO(value.date);
      if(!d) return errorResponse(res, 400, 'VALIDATION_ERROR', 'date tidak valid.');
      const id = 'att_' + nanoid(8);
      insertAttendance.run(id, row.id, userName, value.type || null, status, reason || null, toISODateTimeUTC(d));
      return res.status(201).json({ id, userId: row.id, userName, status, reason, time: toISODateTimeUTC(d) });
    }
    const id = 'att_' + nanoid(8);
    insertAttendance.run(id, row.id, userName, value.type || null, status, reason || null, new Date().toISOString());
    return res.status(201).json({ id, userId: row.id, userName, status, reason, time: new Date().toISOString() });
  } catch (e) { console.error(e); return errorResponse(res, 500, 'INTERNAL', 'Gagal menyimpan absensi.'); }
});

app.get('/attendance', requireAuth, (req, res) => { try { const todayOnly = req.query.today === 'true' || req.query.today === '1'; if(todayOnly){ const today = new Date().toISOString().slice(0,10) + '%'; const rows = db.prepare('SELECT id,user_id,user_name,type,status,reason,time FROM attendance WHERE time LIKE ? ORDER BY time DESC').all(today); return res.json(rows); } const rows = db.prepare('SELECT id,user_id,user_name,type,status,reason,time FROM attendance ORDER BY time DESC LIMIT 500').all(); res.json(rows); } catch (e) { console.error(e); errorResponse(res); } });

app.get('/admin/attendance/summary', requireAuth, requireAdmin, (req, res) => {
  try {
    const month = req.query.month;
    if(!month || !/^\\d{4}-\\d{2}$/.test(month)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Parameter month harus YYYY-MM (contoh 2025-12).');
    const sql = `SELECT a.user_id AS userId, a.user_name AS userName, SUM(CASE WHEN a.status = 'in' THEN 1 ELSE 0 END) AS inCount, SUM(CASE WHEN a.status = 'out' THEN 1 ELSE 0 END) AS outCount, SUM(CASE WHEN a.status = 'sick' THEN 1 ELSE 0 END) AS sickCount, SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) AS leaveCount, SUM(CASE WHEN a.status = 'permission' THEN 1 ELSE 0 END) AS permissionCount, COUNT(*) AS totalRecords FROM attendance a WHERE substr(a.time,1,7) = ? GROUP BY a.user_id, a.user_name ORDER BY a.user_name ASC`;
    const rows = db.prepare(sql).all(month);
    const presentSql = `SELECT user_id as userId, COUNT(DISTINCT substr(time,1,10)) as presentDays FROM attendance WHERE substr(time,1,7) = ? AND status IN ('in','out') GROUP BY user_id`;
    const presentRows = db.prepare(presentSql).all(month);
    const presentMap = {}; presentRows.forEach(r => presentMap[r.userId] = r.presentDays);
    const out = rows.map(r => ({ userId: r.userId, userName: r.userName, presentDays: Number(presentMap[r.userId] || 0), inCount: Number(r.inCount) || 0, outCount: Number(r.outCount) || 0, sickCount: Number(r.sickCount) || 0, leaveCount: Number(r.leaveCount) || 0, permissionCount: Number(r.permissionCount) || 0, totalRecords: Number(r.totalRecords) || 0 }));
    res.json(out);
  } catch (e) { console.error(e); errorResponse(res); }
});

app.get('/admin/attendance/summary.csv', requireAuth, requireAdmin, (req, res) => {
  try {
    const month = req.query.month;
    if(!month || !/^\\d{4}-\\d{2}$/.test(month)) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Parameter month harus YYYY-MM (contoh 2025-12).');
    const sql = `SELECT a.user_id AS userId, a.user_name AS userName, SUM(CASE WHEN a.status = 'in' THEN 1 ELSE 0 END) AS inCount, SUM(CASE WHEN a.status = 'out' THEN 1 ELSE 0 END) AS outCount, SUM(CASE WHEN a.status = 'sick' THEN 1 ELSE 0 END) AS sickCount, SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) AS leaveCount, SUM(CASE WHEN a.status = 'permission' THEN 1 ELSE 0 END) AS permissionCount, COUNT(*) AS totalRecords FROM attendance a WHERE substr(a.time,1,7) = ? GROUP BY a.user_id, a.user_name ORDER BY a.user_name ASC`;
    const rows = db.prepare(sql).all(month);
    const presentSql = `SELECT user_id as userId, COUNT(DISTINCT substr(time,1,10)) as presentDays FROM attendance WHERE substr(time,1,7) = ? AND status IN ('in','out') GROUP BY user_id`;
    const presentRows = db.prepare(presentSql).all(month);
    const presentMap = {}; presentRows.forEach(r => presentMap[r.userId] = r.presentDays);
    const header = ['userId','userName','presentDays','inCount','outCount','sickCount','leaveCount','permissionCount','totalRecords']; const lines = [header.join(',')];
    rows.forEach(r => { const userId = r.userId; const userName = r.userName.replace(/"/g,'""'); const presentDays = presentMap[userId] || 0; const line = [userId, `"${userName}"`, presentDays, r.inCount, r.outCount, r.sickCount, r.leaveCount, r.permissionCount, r.totalRecords].join(','); lines.push(line); });
    const csv = lines.join('\\n'); res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="attendance-summary-${month}.csv"`); res.send(csv);
  } catch (e) { console.error(e); errorResponse(res); }
});

app.use((req,res) => errorResponse(res, 404, 'NOT_FOUND', 'Endpoint tidak ditemukan.'));
app.listen(PORT, () => console.log(`HealthStation (sqlite) listening on ${PORT}, DB: ${DB_PATH}`));
