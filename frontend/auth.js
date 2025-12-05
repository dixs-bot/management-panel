(function(){
  const form = document.getElementById('loginForm');
  const toggle = document.getElementById('togglePwd');
  const pwd = document.getElementById('password');

  toggle?.addEventListener('click', ()=> { pwd.type = pwd.type === 'password' ? 'text' : 'password'; });

  function showAlert(msg, type='danger'){ const el = document.getElementById('alert-placeholder'); el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`; setTimeout(()=> el.innerHTML = '', 4000); }

  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = pwd.value;
    try{
      document.getElementById('btnLogin').setAttribute('disabled','');
      const resp = await api.login(email, password);
      window.location = 'admin.html';
    }catch(err){
      console.error(err);
      showAlert(err.message || 'Gagal login. Periksa kredensial.', 'danger');
    }finally{
      document.getElementById('btnLogin').removeAttribute('disabled');
    }
  });
})();
