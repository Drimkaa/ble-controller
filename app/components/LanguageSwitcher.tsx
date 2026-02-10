"use client";

import { useLocale } from "../../lib/LocaleProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ru' : 'en');
  };

  return (
    <button
      onClick={toggleLocale}
      className="lang-switcher"
      aria-label="Switch language"
      title={locale === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
      <span className="lang-code">{locale.toUpperCase()}</span>
    </button>
  );
}
