/**
 * Serviço de Autenticação — ENERGIZA CRM
 *
 * Gerencia autenticação via Supabase Auth.
 * Mantém compatibilidade com localStorage como fallback.
 *
 * Padrão: Window Global (Scripts Clássicos + IIFE)
 */

window.Auth = (() => {
  'use strict';

  const SESSION_KEY = 'energiza_session';
  const PROFILE_KEY = 'energiza_profile';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

  let _session = null;
  let _profile = null;
  let _refreshTimer = null;
  let _sessionTimer = null;
  let _onAuthChange = null;

  // ─── Perfis e Permissões ───
  const PROFILES = {
    admin: {
      label: 'Administrador',
      permissions: ['all'],
      color: '#ef4444',
    },
    comercial: {
      label: 'Comercial',
      permissions: ['propostas', 'clientes', 'catalogo', 'relatorios'],
      color: '#3b82f6',
    },
    tecnico: {
      label: 'Técnico',
      permissions: ['catalogo', 'relatorios'],
      color: '#22c55e',
    },
    financeiro: {
      label: 'Financeiro',
      permissions: ['relatorios', 'financeiro'],
      color: '#f59e0b',
    },
    leitura: {
      label: 'Leitura',
      permissions: ['dashboard', 'relatorios'],
      color: '#6b7280',
    },
  };

  // ─── Inicialização ───
  function init(onAuthChange) {
    _onAuthChange = onAuthChange || function () {};

    // Restaurar sessão do localStorage
    _restoreSession();

    // Verificar sessão existente no Supabase
    if (window.supabaseClient) {
      _checkExistingSession();
    }

    // Iniciar refresh automático
    _startRefreshTimer();

    return this;
  }

  // ─── Login ───
  async function login(email, password) {
    if (!window.supabaseClient) {
      return { success: false, error: 'Supabase client não inicializado' };
    }

    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        _logSecurity('login_failed', { email: email, error: error.message });
        return { success: false, error: error.message };
      }

      _session = data.session;
      _profile = await _fetchProfile(data.user.id);

      _saveSession();
      _saveProfile();
      _resetSessionTimer();

      _logSecurity('login_success', {
        userId: data.user.id,
        email: data.user.email,
        profile: _profile ? _profile.role : 'unknown',
      });

      _onAuthChange({ user: data.user, session: _session, profile: _profile });

      return { success: true, user: data.user, session: _session, profile: _profile };
    } catch (err) {
      _logSecurity('login_error', { email: email, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // ─── Logout ───
  async function logout() {
    if (!window.supabaseClient) {
      _clearSession();
      _onAuthChange({ user: null, session: null, profile: null });
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient.auth.signOut();

      if (error) {
        console.warn('[Auth] Erro no logout Supabase:', error);
      }

      _logSecurity('logout', {
        userId: _session ? _session.user.id : null,
      });

      _clearSession();
      _onAuthChange({ user: null, session: null, profile: null });

      return { success: true };
    } catch (err) {
      console.warn('[Auth] Erro no logout:', err);
      _clearSession();
      _onAuthChange({ user: null, session: null, profile: null });
      return { success: true };
    }
  }

  // ─── Recuperação de Senha ───
  async function resetPassword(email) {
    if (!window.supabaseClient) {
      return { success: false, error: 'Supabase client não inicializado' };
    }

    try {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      _logSecurity('password_reset_requested', { email: email });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── Alteração de Senha ───
  async function updatePassword(newPassword) {
    if (!window.supabaseClient) {
      return { success: false, error: 'Supabase client não inicializado' };
    }

    try {
      const { error } = await window.supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      _logSecurity('password_changed', {
        userId: _session ? _session.user.id : null,
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── Verificar Sessão ───
  async function _checkExistingSession() {
    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.warn('[Auth] Erro ao verificar sessão:', error);
        return;
      }

      if (session) {
        _session = session;
        _profile = await _fetchProfile(session.user.id);
        _saveSession();
        _saveProfile();
        _resetSessionTimer();
        _onAuthChange({ user: session.user, session: _session, profile: _profile });
      } else {
        _onAuthChange({ user: null, session: null, profile: null });
      }
    } catch (err) {
      console.warn('[Auth] Erro ao verificar sessão:', err);
    }
  }

  // ─── Buscar Perfil ───
  async function _fetchProfile(userId) {
    if (!window.supabaseClient) return null;

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Criar perfil padrão se não existir
        return await _createDefaultProfile(userId);
      }

      return data;
    } catch (err) {
      console.warn('[Auth] Erro ao buscar perfil:', err);
      return null;
    }
  }

  // ─── Criar Perfil Padrão ───
  async function _createDefaultProfile(userId) {
    if (!window.supabaseClient) return null;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

      const profile = {
        id: userId,
        name: user.email.split('@')[0],
        role: 'leitura',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await window.supabaseClient
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.warn('[Auth] Erro ao criar perfil:', error);
        return profile;
      }

      return data;
    } catch (err) {
      console.warn('[Auth] Erro ao criar perfil:', err);
      return null;
    }
  }

  // ─── Refresh Token ───
  async function _refreshSession() {
    if (!window.supabaseClient || !_session) return;

    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.warn('[Auth] Erro ao refresh session:', error);
        _handleSessionExpired();
        return;
      }

      if (session) {
        _session = session;
        _saveSession();
        _resetSessionTimer();
      } else {
        _handleSessionExpired();
      }
    } catch (err) {
      console.warn('[Auth] Erro ao refresh session:', err);
      _handleSessionExpired();
    }
  }

  // ─── Sessão Expirada ───
  function _handleSessionExpired() {
    _logSecurity('session_expired', {
      userId: _session ? _session.user.id : null,
    });

    _clearSession();
    _onAuthChange({ user: null, session: null, profile: null, expired: true });
  }

  // ─── Timer de Refresh ───
  function _startRefreshTimer() {
    _stopRefreshTimer();
    _refreshTimer = setInterval(_refreshSession, REFRESH_INTERVAL);
  }

  function _stopRefreshTimer() {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  // ─── Timer de Sessão ───
  function _resetSessionTimer() {
    if (_sessionTimer) {
      clearTimeout(_sessionTimer);
    }
    _sessionTimer = setTimeout(_handleSessionExpired, SESSION_TIMEOUT);
  }

  // ─── Persistência ───
  function _saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(_session));
    } catch (_) {
      // localStorage full or unavailable
    }
  }

  function _saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(_profile));
    } catch (_) {
      // localStorage full or unavailable
    }
  }

  function _restoreSession() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      const profile = localStorage.getItem(PROFILE_KEY);
      if (session) _session = JSON.parse(session);
      if (profile) _profile = JSON.parse(profile);
    } catch (_) {
      _session = null;
      _profile = null;
    }
  }

  function _clearSession() {
    _session = null;
    _profile = null;
    _stopRefreshTimer();
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROFILE_KEY);
    } catch (_) {
      // localStorage unavailable
    }
  }

  // ─── Auditoria ───
  function _logSecurity(action, data) {
    if (typeof window.Audit !== 'undefined') {
      window.Audit.log(action, data);
    }
  }

  // ─── Getters ───
  function getUser() {
    return _session ? _session.user : null;
  }

  function getSession() {
    return _session;
  }

  function getProfile() {
    return _profile;
  }

  function isAuthenticated() {
    return !!_session && !!_session.user;
  }

  function hasPermission(permission) {
    if (!_profile) return false;
    const profileConfig = PROFILES[_profile.role];
    if (!profileConfig) return false;
    return profileConfig.permissions.includes('all') || profileConfig.permissions.includes(permission);
  }

  function getProfiles() {
    return PROFILES;
  }

  // ─── Atualizar Perfil ───
  async function updateProfile(userId, updates) {
    if (!window.supabaseClient) {
      return { success: false, error: 'Supabase client não inicializado' };
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .upsert({ id: userId, ...updates }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (userId === getUser()?.id) {
        _profile = data;
        _saveProfile();
      }

      return { success: true, profile: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── Listar Usuários (Admin) ───
  async function listUsers() {
    if (!window.supabaseClient || !hasPermission('all')) {
      return { success: false, error: 'Sem permissão' };
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, users: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── API Pública ───
  return {
    init: init,
    login: login,
    logout: logout,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    getUser: getUser,
    getSession: getSession,
    getProfile: getProfile,
    isAuthenticated: isAuthenticated,
    hasPermission: hasPermission,
    // A-11: atalho para verificação de permissão (usado nas views)
    can: function(action) {
      if (window.DEMO_MODE === true || window.location.search.includes('demo=true')) return true;
      if (!isAuthenticated()) return false;
      return hasPermission(action);
    },
    getProfiles: getProfiles,
    updateProfile: updateProfile,
    listUsers: listUsers,
    PROFILES: PROFILES,
  };
})();
