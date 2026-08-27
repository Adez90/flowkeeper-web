import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import sv from "./locales/sv.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";

/** The full set of languages FlowKeeper ships translations for — also what the Profile page's language dropdown offers. */
export const SUPPORTED_LOCALES = ["en", "sv", "es", "de", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
	en: "English",
	sv: "Svenska",
	es: "Español",
	de: "Deutsch",
	fr: "Français",
};

/** True for any locale string this app actually ships translations for — a stored profile locale outside this set (or null) falls back to English. */
export function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
	return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

void i18next.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		sv: { translation: sv },
		es: { translation: es },
		de: { translation: de },
		fr: { translation: fr },
	},
	lng: "en",
	fallbackLng: "en",
	interpolation: { escapeValue: false },
});

export default i18next;
