import { getAccessToken } from '@/lib/auth';

export function saveSession({ access_token, role, display_name, user_id }) {
  localStorage.setItem('ss_admin_token', access_token);
  localStorage.setItem('ss_admin_role', role || '');
  localStorage.setItem('ss_admin_name', display_name || '');
  localStorage.setItem('ss_admin_user_id', String(user_id || ''));
}

export function clearSession() {
  localStorage.removeItem('ss_admin_token');
  localStorage.removeItem('ss_admin_role');
  localStorage.removeItem('ss_admin_name');
  localStorage.removeItem('ss_admin_user_id');
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  return {
    token: localStorage.getItem('ss_admin_token'),
    role: localStorage.getItem('ss_admin_role'),
    name: localStorage.getItem('ss_admin_name'),
    userId: localStorage.getItem('ss_admin_user_id')
  };
}

export function getAccessToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ss_admin_token') || '';
}
