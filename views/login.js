/* =========================================================
   TELA 0 — Login / Autenticação
   Tela de login centralizada usando Auth service.
   ========================================================= */
(() => {
  function render() {
    const container = $('#view-login');
    if (!container) return;

    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo">E</div>
            <h1>ENERGIZA CRM</h1>
            <p>Gestão & Performance</p>
          </div>
          <form id="loginForm" class="login-form">
            <div class="login-field">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" placeholder="seu@email.com" required autocomplete="email" />
            </div>
            <div class="login-field">
              <label for="loginPassword">Senha</label>
              <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <div class="login-error" id="loginError"></div>
            <button type="submit" class="btn btn-primary btn-block" id="loginBtn">
              <span class="login-btn-text">Entrar</span>
              <span class="login-btn-loading" style="display:none">Entrando...</span>
            </button>
            <button type="button" class="btn btn-ghost btn-block" id="forgotPasswordBtn">
              Esqueceu a senha?
            </button>
          </form>
          <div class="login-footer">
            <p>Acesso demo: <strong>demo@energiza.com</strong> / <strong>123456</strong></p>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
  }

  function _bindEvents() {
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    const forgotBtn = document.getElementById('forgotPasswordBtn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        errorEl.textContent = '';
        btn.querySelector('.login-btn-text').style.display = 'none';
        btn.querySelector('.login-btn-loading').style.display = 'inline';
        btn.disabled = true;

        const result = await Auth.login(email, password);

        btn.querySelector('.login-btn-text').style.display = 'inline';
        btn.querySelector('.login-btn-loading').style.display = 'none';
        btn.disabled = false;

        if (!result.success) {
          errorEl.textContent = result.error || 'Erro ao fazer login';
        }
      });
    }

    if (forgotBtn) {
      forgotBtn.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        if (!email) {
          errorEl.textContent = 'Digite seu email para recuperar a senha';
          return;
        }
        const result = await Auth.resetPassword(email);
        if (result.success) {
          errorEl.textContent = 'Email de recuperação enviado!';
          errorEl.style.color = 'var(--success)';
        } else {
          errorEl.textContent = result.error;
          errorEl.style.color = '';
        }
      });
    }
  }

  function showError(msg) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.color = '';
    }
  }

  VIEWS.register('login', {
    title: 'Login',
    subtitle: 'Acesse sua conta',
    render: render,
    showError: showError,
  });
})();
