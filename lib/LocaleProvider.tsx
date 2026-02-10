"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { Locale } from './i18n';

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  
  // Try localStorage first
  const saved = localStorage.getItem('locale') as Locale | null;
  if (saved && (saved === 'en' || saved === 'ru')) {
    return saved;
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.split('-')[0];
  return (browserLang === 'ru' ? 'ru' : 'en') as Locale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<any>(null);

  useEffect(() => {
    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);
    loadMessages(initialLocale);
  }, []);

  const loadMessages = async (loc: Locale) => {
    const msgs = await import(`../messages/${loc}.json`);
    setMessages(msgs.default);
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    loadMessages(newLocale);
  };

  if (!messages) {
    return null; // or a loading spinner
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
