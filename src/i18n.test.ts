import { describe, expect, it } from "vitest";
import { translations } from "./i18n";

// Cheap guard against a missing translation: every key present in English must
// exist in both Chinese dicts, with the same type (string vs interpolating fn).
describe("translations — key completeness", () => {
  const enKeys = Object.keys(translations.en) as (keyof typeof translations.en)[];

  for (const lang of ["zh-Hans", "zh-Hant"] as const) {
    it(`${lang} has every English key, matching value type`, () => {
      const dict = translations[lang];
      for (const key of enKeys) {
        expect(dict, `${lang} missing key: ${key}`).toHaveProperty(key);
        expect(typeof dict[key], `${lang}.${key} type mismatch`).toBe(typeof translations.en[key]);
      }
    });
  }
});
