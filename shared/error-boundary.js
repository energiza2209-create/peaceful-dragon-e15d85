/**
 * Error Boundary Global — ENERGIZA CRM
 *
 * Captura erros não tratados e exibe fallback amigável.
 * Registra erro no logger e permite recarregar a página.
 */

function createErrorBoundary() {
  if (typeof document === 'undefined') return;

  const overlay = document.createElement('div');
  overlay.id = 'error-boundary-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: #0a0a0a;
    color: #fff;
    font-family: 'Inter', sans-serif;
    align-items: center;
    justify-content: center;
    padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="max-width: 520px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #FFE600;">
        Algo deu errado
      </h2>
      <p style="font-size: 14px; color: rgba(255,255,255,.6); margin-bottom: 8px; line-height: 1.5;">
        Ocorreu um erro inesperado. Seus dados estão seguros.
      </p>
      <p id="error-boundary-message" style="font-size: 12px; color: rgba(255,255,255,.35); margin-bottom: 24px; word-break: break-all; font-family: monospace;">
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="error-boundary-reload" style="
          background: #FFE600; color: #000; border: none; padding: 12px 24px;
          border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
        ">
          Recarregar Página
        </button>
        <button id="error-boundary-dismiss" style="
          background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.15);
          padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; cursor: pointer;
        ">
          Fechar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('error-boundary-reload').addEventListener('click', function () {
    window.location.reload();
  });

  document.getElementById('error-boundary-dismiss').addEventListener('click', function () {
    overlay.style.display = 'none';
  });

  function showError(message) {
    var msgEl = document.getElementById('error-boundary-message');
    if (msgEl) msgEl.textContent = message;
    overlay.style.display = 'flex';
  }

  window.addEventListener('error', function (event) {
    event.preventDefault();
    var msg = event.message || 'Erro desconhecido';
    var source = event.filename || '';
    var line = event.lineno || '';
    var col = event.colno || '';

    if (typeof window.logger !== 'undefined') {
      window.logger.error('Unhandled error: ' + msg, 'error-boundary', {
        source: source,
        line: line,
        col: col,
        stack: event.error && event.error.stack,
      });
    }

    showError(msg + '\n' + source + ':' + line + ':' + col);
  });

  window.addEventListener('unhandledrejection', function (event) {
    event.preventDefault();
    var msg = (event.reason && event.reason.message) || String(event.reason) || 'Promise rejection';

    if (typeof window.logger !== 'undefined') {
      window.logger.error('Unhandled rejection: ' + msg, 'error-boundary', {
        stack: event.reason && event.reason.stack,
      });
    }

    showError(msg);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createErrorBoundary);
  } else {
    createErrorBoundary();
  }
}
