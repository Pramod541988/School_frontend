const TOKEN_KEY = 'ss_admin_token';
const ROLE_KEY = 'ss_admin_role';
const NAME_KEY = 'ss_admin_name';
const USER_ID_KEY = 'ss_admin_user_id';
const MUST_CHANGE_KEY = 'ss_must_change_password';

function toBool(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return false;
}

export function saveSession({
  access_token,
  role,
  display_name,
  user_id,
  must_change_password
}) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, access_token || '');
  localStorage.setItem(ROLE_KEY, role || '');
  localStorage.setItem(NAME_KEY, display_name || '');
  localStorage.setItem(USER_ID_KEY, String(user_id || ''));
  localStorage.setItem(MUST_CHANGE_KEY, String(!!must_change_password));
}

export function updateSession(patch = {}) {
  if (typeof window === 'undefined') return;
  const current = getSession() || {};

  saveSession({
    access_token: patch.access_token ?? current.token ?? '',
    role: patch.role ?? current.role ?? '',
    display_name: patch.display_name ?? current.name ?? '',
    user_id: patch.user_id ?? current.userId ?? '',
    must_change_password:
      patch.must_change_password ?? current.mustChangePassword ?? false
  });
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(MUST_CHANGE_KEY);
}

export function getSession() {
  if (typeof window === 'undefined') return null;

  return {
    token: localStorage.getItem(TOKEN_KEY),
    role: localStorage.getItem(ROLE_KEY),
    name: localStorage.getItem(NAME_KEY),
    userId: localStorage.getItem(USER_ID_KEY),
    mustChangePassword: toBool(localStorage.getItem(MUST_CHANGE_KEY))
  };
}

export function getAccessToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) || '';
}
