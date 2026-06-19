import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Type, ZoomIn, ZoomOut } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Slider } from "@/components/ui/slider";
import { useTextSize } from "@/hooks/use-text-size";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/preferences")({
  head: () => ({
    meta: [
      { title: "Accessibility Preferences — Vault OS" },
      { name: "description", content: "Adjust application font size for better readability." },
    ],
  }),
  component: PreferencesPage,
});

function PreferencesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { textSize, setTextSize, updateTextSizeInDb } = useTextSize();

  const currentSize = parseInt(textSize, 10) || 100;

  const handleSliderChange = (values: number[]) => {
    if (values[0]) {
      setTextSize(values[0].toString());
    }
  };

  const handleSliderCommit = async (values: number[]) => {
    if (values[0]) {
      await updateTextSizeInDb(values[0].toString());
    }
  };

  const getSizeLabel = (size: number) => {
    if (size <= 85) return t("preferences.textSize.small", "Small");
    if (size <= 105) return t("preferences.textSize.default", "Default");
    if (size <= 125) return t("preferences.textSize.large", "Large");
    if (size <= 145) return t("preferences.textSize.extraLarge", "Extra Large");
    return t("preferences.textSize.huge", "Huge");
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/settings" })}
              className="rounded-full hover:bg-muted/80 shrink-0"
            >
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">
                {t("preferences.title", "Preferences & Accessibility")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t("preferences.description", "Customize your display settings to make Vault OS easier to read and use.")}
              </p>
            </div>
          </div>

          {/* Resizer Card */}
          <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-sm p-8 sm:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4 pb-6 border-b border-border/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                  <Type className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {t("preferences.textSize.title", "Text Size Resizer")}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {t("preferences.textSize.description", "Drag the slider to adjust the interface text size for optimal readability. This helps short or long-sighted users.")}
                  </p>
                </div>
              </div>

              {/* Slider Interface */}
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("preferences.textSize.currentScale", "Current Scale")}
                  </span>
                  <span className="text-lg font-bold text-primary font-mono bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {currentSize}% ({getSizeLabel(currentSize)})
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <ZoomOut className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 px-2">
                    <Slider
                      defaultValue={[currentSize]}
                      value={[currentSize]}
                      min={80}
                      max={160}
                      step={10}
                      onValueChange={handleSliderChange}
                      onValueCommit={handleSliderCommit}
                      className="py-4 cursor-pointer"
                    />
                  </div>
                  <ZoomIn className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>

                {/* Scale Indicators */}
                <div className="flex justify-between text-xs text-muted-foreground/80 font-mono px-1">
                  <span>80%</span>
                  <span>100% ({t("preferences.textSize.defaultIndicator", "Normal")})</span>
                  <span>120%</span>
                  <span>140%</span>
                  <span>160%</span>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-2xl border border-border/40 bg-input/20 p-6 sm:p-8 space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
                  {t("preferences.preview.title", "Live Preview")}
                </h3>
                <div className="space-y-2">
                  <p className="font-serif text-lg text-foreground font-semibold">
                    {t("preferences.preview.sampleTitle", "Vault OS Accessibility")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("preferences.preview.sampleText", "This is a real-time preview of how text will look across the digital wallet dashboard, transaction logs, and financial advice cards.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
