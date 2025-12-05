(function(global){
  const API_BASE = (global.API_BASE || 'http://localhost:4001');

  function setToken(token){ if(token) localStorage.setItem('hs_token', token); else localStorage.removeItem('hs_token'); }
  function getToken(){ return localStorage.getItem('hs_token'); }
  function setUser(u){ if(u) localStorage.setItem('hs_user', JSON.stringify(u)); else localStorage.removeItem('hs_user'); }
  function getUser(){ try { return JSON.parse(localStorage.getItem('hs_user') || 'null'); } catch(e){ return null; } }

  async function safeJson(res){ const txt = await res.text(); if(!txt) return null; try { return JSON.parse(txt); } catch(e){ return txt; } }

  async function call(path, opts = {}){
    const headers = Object.assign({}, opts.headers || {});
    headers['Accept'] = 'application/json';
    if(!opts.noJson) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const token = getToken();
    if(token && !headers['Authorization']) headers['Authorization'] = 'Bearer ' + token;
    const init = Object.assign({}, opts, { headers });
    if(init.body && typeof init.body === 'object' && headers['Content-Type'] && headers['Content-Type'].includes('application/json')){ init.body = JSON.stringify(init.body); }
    const res = await fetch(API_BASE + path, init);
    const payload = await safeJson(res);
    if(res.ok) return payload;
    const e = new Error('Request failed');
    e.status = res.status;
    if(payload && payload.error){ e.code = payload.error.code; e.message = payload.error.message || payload.error.code || e.message; e.fields = payload.error.fields || null; e.requestId = payload.error.requestId || null; } else if(payload && payload.message){ e.message = payload.message; } else { e.message = payload || res.statusText || e.message; }
    if(res.status === 401){ setToken(null); setUser(null); }
    throw e;
  }

  async function login(email, password){ const resp = await call('/auth/login', { method: 'POST', body: { email, password } }); if(resp && resp.token){ setToken(resp.token); setUser(resp.user || null); } return resp; }
  async function whoami(){ return call('/auth/me', { method: 'GET' }); }
  async function getStats(){ return call('/admin/stats', { method: 'GET' }); }
  async function listUsers(params = {}) { const qp = new URLSearchParams(); if(params.page) qp.set('page', params.page); if(params.per_page) qp.set('per_page', params.per_page); if(params.search) qp.set('search', params.search); const q = qp.toString() ? ('?' + qp.toString()) : ''; return call('/admin/users' + q, { method: 'GET' }); }
  async function createUser(payload){ return call('/admin/users', { method: 'POST', body: payload }); }
  async function updateUser(id, payload){ return call('/admin/users/' + encodeURIComponent(id), { method: 'PUT', body: payload }); }
  async function changeUserPassword(id, newPassword){ return call('/admin/users/' + encodeURIComponent(id) + '/password', { method: 'PUT', body: { newPassword } }); }
  async function listAdmins(){ return call('/admin/admins', { method: 'GET' }); }
  async function createAdmin(payload){ return call('/admin/admins', { method: 'POST', body: payload }); }
  async function changeAdminPassword(id, newPassword){ return call('/admin/admins/' + encodeURIComponent(id) + '/password', { method: 'PUT', body: { newPassword } }); }
  async function markAttendance(payload){ return call('/attendance', { method: 'POST', body: payload }); }
  async function listAttendance(q = ''){ return call('/attendance' + q, { method: 'GET' }); }
  function logout(){ setToken(null); setUser(null); }
  global.api = { setToken, getToken, setUser, getUser, login, whoami, logout, getStats, listUsers, createUser, updateUser, changeUserPassword, listAdmins, createAdmin, changeAdminPassword, markAttendance, listAttendance, API_BASE };
})(window);
