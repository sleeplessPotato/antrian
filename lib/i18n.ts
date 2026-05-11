import idTranslations from "@/i18n/id.json";
import enTranslations from "@/i18n/en.json";

export type Locale = "id" | "en";

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

const translations: Record<Locale, typeof idTranslations> = {
  id: idTranslations,
  en: enTranslations as unknown as typeof idTranslations,
};

export function getTranslations(locale: Locale) {
  return translations[locale] ?? translations.id;
}

export function t(locale: Locale, key: string): string {
  const parts = key.split(".");
  let current: unknown = translations[locale] ?? translations.id;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}
