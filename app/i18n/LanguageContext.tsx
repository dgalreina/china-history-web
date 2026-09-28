'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { dictionary, type Lang, type Textos } from './dictionary';

const STORAGE_KEY = 'china-history-lang';

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void; t: Textos };

const LanguageContext = createContext<LanguageContextValue | null>(null);

function leerLangGuardado(): Lang {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'es' || guardado === 'en' || guardado === 'zh') return guardado;
  } catch {
    // localStorage no disponible (SSR, modo privado, storage bloqueado) — en por defecto.
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Arranca en 'en' (igual en servidor y cliente, evita mismatch de
  // hidratación) y se corrige con lo guardado justo después de montar.
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(leerLangGuardado());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
  }, [lang]);

  const setLang = (nuevo: Lang) => {
    setLangState(nuevo);
    try {
      localStorage.setItem(STORAGE_KEY, nuevo);
    } catch {
      // Sin persistencia disponible — el idioma se queda solo para esta sesión.
    }
  };

  return <LanguageContext.Provider value={{ lang, setLang, t: dictionary[lang] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() debe usarse dentro de <LanguageProvider>');
  return ctx;
}
