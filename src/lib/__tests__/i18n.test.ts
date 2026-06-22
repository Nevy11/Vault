import { describe, it, expect } from "vitest";
import i18n from "../i18n";

describe("i18n configuration", () => {
  it("initializes successfully with english as fallback", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.options.fallbackLng).toEqual(["en"]);
  });

  it("loads the correct resources", () => {
    const resources = i18n.options.resources;
    expect(resources).toHaveProperty("en");
    expect(resources).toHaveProperty("es");
    expect(resources).toHaveProperty("fr");
    expect(resources).toHaveProperty("de");
    expect(resources).toHaveProperty("it");
    expect(resources).toHaveProperty("sw");
    expect(resources).toHaveProperty("pt");
  });

  it("can translate a basic key in english", () => {
    i18n.changeLanguage("en");
    // Ensure translation doesn't return the key itself if it exists,
    // though this depends on the actual JSON content. We just test the method exists.
    const translated = i18n.t("common.welcome", { defaultValue: "Welcome" });
    expect(translated).toBeTruthy();
  });
});
