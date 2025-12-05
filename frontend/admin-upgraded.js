(function(){
  if(!window.api){ console.error('api-client.js not loaded'); return; }
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('#navMenu .nav-link');
  const whoami = document.getElementById('whoami');
  const user = api.getUser();
  if(!user){ window.location = 'index.html'; return; }
  whoami.textContent = user.name || user.email;
  navLinks.forEach(a => a.addEventListener('click', (ev)=>{ ev.preventDefault(); navLinks.forEach(x => x.classList.remove('active')); a.classList.add('active'); showSection(a.dataset.section); }));
  function showSection(id){ sections.forEach(s => s.classList.add('d-none')); const el = document.getElementById(id); if(el) el.classList.remove('d-none'); }
  showSection('dashboard');
  document.getElementById('btnLogout').addEventListener('click', ()=>{ api.logout(); window.location = 'index.html'; });
  async function loadStats(){ try{ const s = await api.getStats(); document.getElementById('statUsers').textContent = s.totalUsers ?? '-'; document.getElementById('statAdmins').textContent = s.totalAdmins ?? '-'; document.getElementById('statAbsensi').textContent = s.attendanceToday ?? '-'; }catch(e){ console.warn(e); } }
  document.getElementById('btnRefresh')?.addEventListener('click', loadStats);
  loadStats();

  /* Users */
  const usersTableBody = document.querySelector('#usersTable tbody');
  async function loadUsers(){
    usersTableBody.innerHTML = '<tr><td colspan="7">Memuat...</td></tr>';
    try{
      const list = await api.listUsers({ page:1, per_page:200 });
      usersTableBody.innerHTML = '';
      list.data.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.email}</td>
          <td>${u.name || '-'}</td>
          <td>${u.department || '-'}</td>
          <td>${u.position || '-'}</td>
          <td><span class="badge bg-info badge-role">${u.role}</span></td>
          <td>${u.active? '<span class="badge bg-success">Active</span>':'<span class="badge bg-secondary">Disabled</span>'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-action="detail" data-id="${u.id}">Detail</button>
            <button class="btn btn-sm btn-outline-warning me-1" data-action="pwd" data-id="${u.id}">Ubah Pw</button>
            <button class="btn btn-sm btn-outline-danger" data-action="toggle" data-id="${u.id}">${u.active? 'Nonaktifkan':'Aktifkan'}</button>
          </td>`;
        usersTableBody.appendChild(tr);
      });
    }catch(e){ usersTableBody.innerHTML = `<tr><td colspan="7" class="text-danger">Gagal memuat user</td></tr>`; console.error(e); }
  }
  loadUsers();

  /* Add user modal */
  const modalUserEl = document.getElementById('modalUser');
  const modalUser = modalUserEl ? new bootstrap.Modal(modalUserEl) : null;
  const formUser = document.getElementById('formUser');
  document.getElementById('btnAddUser')?.addEventListener('click', ()=>{ formUser.reset(); formUser.dataset.editId = ''; modalUser.show(); });
  formUser?.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(formUser); const payload = { email: (fd.get('email') || '').trim(), name: (fd.get('name') || '').trim(), password: fd.get('password'), role: fd.get('role') || 'staff', department: (fd.get('department') || '').trim(), position: (fd.get('position') || '').trim(), dob: fd.get('dob') || null, employmentDate: fd.get('employmentDate') || null, gender: fd.get('gender') || null, education: (fd.get('education') || '').trim(), phone: (fd.get('phone') || '').trim(), address: (fd.get('address') || '').trim() }; try{ await api.createUser(payload); modalUser.hide(); loadUsers(); showToast('Pegawai berhasil ditambahkan','success'); }catch(err){ console.error(err); showToast(err.message || 'Gagal menambahkan pegawai','danger'); } });

  /* table action delegation */
  usersTableBody.addEventListener('click', (ev)=>{ const btn = ev.target.closest('button'); if(!btn) return; const action = btn.dataset.action; const id = btn.dataset.id; const row = btn.closest('tr'); if(action === 'toggle'){ (async ()=>{ try{ const currentActive = row.querySelector('td:nth-child(6)').textContent.includes('Active'); await api.updateUser(id, { active: !currentActive }); await loadUsers(); showToast('Status user diperbarui','success'); }catch(e){ showToast('Gagal memperbarui status','danger'); console.error(e) } })(); } else if(action === 'pwd'){ const modalPwd = new bootstrap.Modal(document.getElementById('modalPwd')); document.querySelector('#formPwd [name="userId"]').value = id; modalPwd.show(); } else if(action === 'detail'){ showUserDetail(id); } });

  const formPwd = document.getElementById('formPwd');
  formPwd?.addEventListener('submit', async (e)=>{ e.preventDefault(); const id = formPwd.userId.value; const newPassword = formPwd.newPassword.value; try{ await api.changeUserPassword(id, newPassword); bootstrap.Modal.getInstance(document.getElementById('modalPwd')).hide(); showToast('Password berhasil diubah','success'); }catch(e){ showToast('Gagal mengubah password','danger'); console.error(e) } });

  async function showUserDetail(id){ try{ const list = await api.listUsers({ page:1, per_page:500 }); const u = list.data.find(x => x.id === id); if(!u){ showToast('Detail user tidak ditemukan','danger'); return; } const html = `
        <div class="row">
          <div class="col-md-6">
            <div class="detail-row mb-2"><strong>Nama:</strong> ${u.name || '-'}</div>
            <div class="detail-row mb-2"><strong>NIP / Email:</strong> ${u.email}</div>
            <div class="detail-row mb-2"><strong>Role:</strong> ${u.role}</div>
            <div class="detail-row mb-2"><strong>Status:</strong> ${u.active? 'Active':'Disabled'}</div>
          </div>
          <div class="col-md-6">
            <div class="detail-row mb-2"><strong>Departemen:</strong> ${u.department || '-'}</div>
            <div class="detail-row mb-2"><strong>Jabatan:</strong> ${u.position || '-'}</div>
            <div class="detail-row mb-2"><strong>Tgl Lahir:</strong> ${u.dob || '-'}</div>
            <div class="detail-row mb-2"><strong>Tgl Masuk:</strong> ${u.employmentDate || '-'}</div>
          </div>
          <div class="col-12 mt-2">
            <div class="detail-row"><strong>Pendidikan:</strong> ${u.education || '-'}</div>
            <div class="detail-row mt-2"><strong>Telepon:</strong> ${u.phone || '-'}</div>
            <div class="detail-row mt-2"><strong>Alamat:</strong> ${u.address || '-'}</div>
          </div>
        </div>
      `; document.getElementById('detailContent').innerHTML = html; const dmodal = new bootstrap.Modal(document.getElementById('modalUserDetail')); dmodal.show(); }catch(e){ console.error(e); showToast('Gagal memuat detail','danger') } }

  /* Admins & attendance - simplified / reuse similar logic */
  async function loadAdmins(){ try{ const list = await api.listAdmins(); const tbody = document.querySelector('#adminsTable tbody'); tbody.innerHTML = ''; list.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.email}</td><td>${a.name||'-'}</td><td><button class="btn btn-sm btn-outline-warning" data-id="${a.id}" data-action="pwd-admin">Ubah Pw</button></td>`; tbody.appendChild(tr); }); }catch(e){ console.error(e);} }
  document.getElementById('btnAddAdmin')?.addEventListener('click', ()=>{ formUser.reset(); formUser.role.value = 'admin'; modalUser.show(); });
  loadAdmins();

  /* Attendance (initial simple load) */
  (async function attendanceInit(){
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const summaryTableBody = document.querySelector('#summaryTable tbody');
    const monthSelect = document.getElementById('monthSelect');
    function fillMonthOptions(){ monthSelect.innerHTML=''; const now = new Date(); for(let i=0;i<12;i++){ const d = new Date(now.getFullYear(), now.getMonth()-i, 1); const val = d.toISOString().slice(0,7); const opt = document.createElement('option'); opt.value = val; opt.textContent = `${d.toLocaleString('default',{month:'long'})} ${d.getFullYear()}`; monthSelect.appendChild(opt);} monthSelect.value = new Date().toISOString().slice(0,7);}
    fillMonthOptions();
    async function loadAttendanceList(){ attendanceTableBody.innerHTML = '<tr><td colspan="5">Memuat...</td></tr>'; try{ const list = await api.listAttendance('?today=true'); attendanceTableBody.innerHTML = ''; list.forEach(a => { const tr = document.createElement('tr'); const time = new Date(a.time).toLocaleString(); tr.innerHTML = `<td>${time}</td><td>${a.userName||a.userEmail}</td><td>${a.status||a.type}</td><td>${a.type||'-'}</td><td>${a.reason||'-'}</td>`; attendanceTableBody.appendChild(tr); }); }catch(e){ attendanceTableBody.innerHTML = '<tr><td colspan="5" class="text-danger">Gagal memuat</td></tr>'; console.error(e); } }
    document.getElementById('btnMark')?.addEventListener('click', async ()=>{ try{ await api.markAttendance({ status:'in' }); showToast('Absensi masuk tercatat','success'); loadAttendanceList(); }catch(e){ showToast('Gagal menandai absensi','danger'); console.error(e); } });
    const addStatusModalEl = document.getElementById('modalAddStatus'); const addStatusModal = new bootstrap.Modal(addStatusModalEl);
    document.getElementById('btnAddStatus')?.addEventListener('click', async ()=>{ const select = document.getElementById('selectUserForStatus'); select.innerHTML = '<option value=\"\">Memuat...</option>'; try{ const users = await api.listUsers({ page:1, per_page:500 }); select.innerHTML = '<option value=\"\">Pilih pegawai...</option>'; users.data.forEach(u => { const opt = document.createElement('option'); opt.value = u.id; opt.textContent = `${u.name || u.email} (${u.email})`; select.appendChild(opt); }); addStatusModal.show(); }catch(e){ select.innerHTML = '<option value=\"\">Gagal memuat</option>'; showToast('Gagal memuat daftar pegawai','danger'); console.error(e); } });
    document.getElementById('formAddStatus')?.addEventListener('submit', async (ev)=>{ ev.preventDefault(); const fd = new FormData(ev.target); const userId = fd.get('selectUserForStatus') || document.getElementById('selectUserForStatus').value; const status = fd.get('status'); const reason = fd.get('reason') || ''; const date = fd.get('date') || null; const fromDate = fd.get('fromDate') || null; const toDate = fd.get('toDate') || null; if(!userId || !status){ showToast('Pilih pegawai & status','danger'); return; } try{ if(fromDate && toDate){ if(new Date(fromDate) > new Date(toDate)){ showToast('From date tidak boleh setelah To date','danger'); return; } await api.markAttendance({ status, reason, userId, fromDate, toDate }); } else if(date){ await api.markAttendance({ status, reason, userId, date }); } else { await api.markAttendance({ status, reason, userId }); } addStatusModal.hide(); showToast('Status absensi tersimpan','success'); loadAttendanceList(); }catch(e){ console.error(e); showToast(e.message || 'Gagal menyimpan status','danger'); } });
    document.getElementById('btnLoadSummary')?.addEventListener('click', async ()=>{ const month = monthSelect.value; if(!month){ showToast('Pilih bulan terlebih dahulu','danger'); return; } try{ summaryTableBody.innerHTML = '<tr><td colspan=\"8\">Memuat...</td></tr>'; const rows = await fetch(api.API_BASE + `/admin/attendance/summary?month=${month}`, { headers: { 'Authorization': 'Bearer ' + api.getToken(), 'Accept': 'application/json' } }).then(r => { if(!r.ok) throw new Error('Gagal memuat rekap: ' + r.status); return r.json(); }); summaryTableBody.innerHTML = ''; rows.forEach(r => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.userName}</td><td>${r.presentDays}</td><td>${r.inCount}</td><td>${r.outCount}</td><td>${r.leaveCount}</td><td>${r.sickCount}</td><td>${r.permissionCount}</td><td>${r.totalRecords}</td>`; summaryTableBody.appendChild(tr); }); }catch(e){ summaryTableBody.innerHTML = '<tr><td colspan=\"8\" class=\"text-danger\">Gagal memuat rekap</td></tr>'; console.error(e); showToast('Gagal memuat rekap','danger'); } });
    document.getElementById('btnExportCSV')?.addEventListener('click', async ()=>{ const month = monthSelect.value; if(!month){ showToast('Pilih bulan terlebih dahulu','danger'); return; } try{ const token = api.getToken(); const url = api.API_BASE + `/admin/attendance/summary.csv?month=${month}`; const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token }}); if(!res.ok) throw new Error('Gagal export CSV: ' + res.status); const blob = await res.blob(); const filename = `attendance-summary-${month}.csv`; const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); link.remove(); showToast('CSV diunduh', 'success'); }catch(e){ console.error(e); showToast('Gagal export CSV','danger'); } });
    loadAttendanceList();
  })();

  function showToast(msg, type='info'){ const el = document.createElement('div'); el.className = `toast align-items-center text-bg-${type==='success'?'success':(type==='danger'?'danger':'primary')} border-0 show`; el.style.position='fixed'; el.style.right='20px'; el.style.bottom='20px'; el.style.zIndex=9999; el.setAttribute('role','alert'); el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button class="btn-close btn-close-white ms-auto me-2" onclick="this.closest('.toast').remove()"></button></div>`; document.body.appendChild(el); setTimeout(()=> el.remove(), 3000); }
})();
