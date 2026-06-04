import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Translation files
import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import it from "../locales/it.json";
import sw from "../locales/sw.json";
import pt from "../locales/pt.json";

console.log("Initializing i18n...");

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(
    {
      resources: {
        en: { translation: en },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
        it: { translation: it },
        sw: { translation: sw },
        pt: { translation: pt },
      },
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
    },
    (err, t) => {
      if (err) console.error("i18n init error:", err);
      else console.log("i18n initialized successfully");
    },
  );

export default i18n;
