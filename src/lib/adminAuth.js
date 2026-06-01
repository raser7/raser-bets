export const ADMIN_SESSION_KEY = 'raserbets_admin_session';

export function getAdminBasePath() {
  return `/${import.meta.env.VITE_ADMIN_PATH || 'admin'}`;
}

export function getChipControlPath() {
  return `${getAdminBasePath()}/chips-control`;
}

export function isAdminSessionActive() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function setAdminSessionActive(isActive) {
  if (typeof window === 'undefined') return;

  if (isActive) {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
