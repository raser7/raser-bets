import { useLayoutEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getPreferredTheme);

  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    const nextTheme = theme === 'light' ? 'dark' : 'light';

    root.classList.add('theme-switching');
    setTheme(nextTheme);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-[999] p-3.5 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center outline-none focus:outline-none"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="w-6 h-6 text-slate-800 fill-slate-800" />
      ) : (
        <Sun className="w-6 h-6 text-brand fill-brand" />
      )}
    </button>
  );
}
