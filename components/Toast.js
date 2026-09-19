import { useEffect } from 'react';

let toastFn = null;

export function showToast(msg, type = 'success') {
  if (toastFn) toastFn(msg, type);
}

export default function Toast() {
  useEffect(() => {
    toastFn = (msg, type) => {
      let t = document.getElementById('toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
      }
      t.className = `toast ${type}`;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('show'), 3000);
    };
    return () => { toastFn = null; };
  }, []);
  return null;
}
