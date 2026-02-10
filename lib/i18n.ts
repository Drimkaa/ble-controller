import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export const locales = ['en', 'ru'] as const;
export type Locale = typeof locales[number];

function getLocaleFromBrowser(): Locale {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language.split('-')[0];
  return locales.includes(browserLang as Locale) ? (browserLang as Locale) : 'en';
}

export default getRequestConfig(async () => {
  // Try to get locale from localStorage on client
  let locale: Locale = 'en';
  
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale') as Locale | null;
    locale = saved || getLocaleFromBrowser();
  } else {
    // On server, try to detect from accept-language header
    try {
      const headersList = await headers();
      const acceptLanguage = headersList.get('accept-language');
      if (acceptLanguage) {
        const preferredLang = acceptLanguage.split(',')[0].split('-')[0];
        locale = locales.includes(preferredLang as Locale) ? (preferredLang as Locale) : 'en';
      }
    } catch {
      // If headers() fails, use default
      locale = 'en';
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
