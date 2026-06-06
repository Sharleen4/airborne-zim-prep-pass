import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ImageIcon, Loader2, Download, RefreshCw, AlertCircle, Plus, BookOpen, GraduationCap, Table as TableIcon, Palette } from "lucide-react";

const VARIANTS_PER_BATCH = 2;

// Style modes the teacher can pick per suggestion. Each mode rewrites the prompt
// so the AI produces the right kind of visual: friendly illustration, labelled
// textbook diagram, exam-style ZIMSEC diagram, or a blank data-collection table.
const STYLE_MODES = {
  illustration: {
    label: "Illustration",
    icon: Palette,
    description: "Friendly classroom illustration",
    variants: [
      "bright, friendly flat illustration with bold outlines, vivid colours, clean white background",
      "soft watercolour-style illustration with gentle pastel tones, hand-drawn feel",
      "cheerful cartoon-style illustration with clear shapes and warm colours",
    ],
    rules: "Age-appropriate cartoon/illustration. No labels required. Focus on showing the scene clearly.",
  },
  textbook_diagram: {
    label: "Textbook Diagram",
    icon: BookOpen,
    description: "Labelled diagram like a school textbook",
    variants: [
      "clean labelled textbook diagram, white background, black outlines, soft colour fills, clear label lines pointing to each part with neat printed labels",
      "primary-school textbook diagram, simple line art with light colour shading, every important part labelled with a thin leader line and a printed label in a sans-serif font",
    ],
    rules:
      "Produce a clear LABELLED diagram in the style of a primary-school science/social-studies textbook. " +
      "Every important part MUST have a thin leader line pointing to it with a short printed label in clear English (e.g. 'roots', 'stem', 'leaves', 'flower'; or 'evaporation', 'condensation', 'precipitation', 'collection'). " +
      "Use accurate proportions and scientifically correct details. White or very light background. No watermarks, no logos, no extra decorative elements.",
  },
  zimsec_diagram: {
    label: "ZIMSEC Diagram",
    icon: GraduationCap,
    description: "Exam-style black & white labelled diagram",
    variants: [
      "ZIMSEC exam-style diagram, black and white line drawing on white background, neat printed labels with arrows or leader lines pointing to each labelled part, technical but simple",
      "ZIMSEC examination-paper style scientific diagram, monochrome line art, every part labelled with a capital letter (A, B, C, D) and a key below the diagram listing what each letter means",
    ],
    rules:
      "Produce a ZIMSEC examination-style diagram: clean black-and-white line drawing on a pure white background, " +
      "scientifically accurate, with every important part clearly labelled using a thin leader line and a short printed label (or a capital letter A, B, C... with a key listed below the diagram). " +
      "No colours, no shading beyond light hatching where strictly needed, no decorative elements, no Zimbabwean cultural styling — this must look like it came from a real ZIMSEC past paper.",
  },
  data_table: {
    label: "Data Table",
    icon: TableIcon,
    description: "Blank table for data collection / interpretation",
    variants: [
      "clean printable data-collection table on a white background, thick black borders, clear column headers in bold, empty rows for learners to write in, neat sans-serif printed text",
      "primary-school data-interpretation table, simple grid with bold header row, blank cells underneath, large enough rows for a learner to write a number or word in pencil",
    ],
    rules:
      "Produce a BLANK printable DATA TABLE suitable for learners to record observations or for data interpretation. " +
      "Use a clean grid with thick black borders, a bold header row with clear column titles in plain English directly relevant to the suggestion, " +
      "and 5–8 empty rows underneath for learners to fill in. White background, no decoration, no extra illustrations — the page must look like a printable worksheet.",
  },
};

const DEFAULT_MODE = "illustration";

export default function TeachingImageGenerator({ topic, plan, items, onImagesChange }) {
  // images: { [idx]: { urls: string[], loading: boolean, error?: string, mode: string } }
  const [images, setImages] = useState({});
  // modes: { [idx]: "illustration" | "textbook_diagram" | "zimsec_diagram" | "data_table" }
  const [modes, setModes] = useState({});

  const getMode = (idx) => modes[idx] || DEFAULT_MODE;
  const setMode = (idx, mode) => setModes(prev => ({ ...prev, [idx]: mode }));

  // Notify parent whenever images change so they can be embedded in presentation/exports.
  // We send a flat list of the first URL per suggestion (one image per teaching idea).
  const notifyParent = (next) => {
    if (!onImagesChange) return;
    const flat = Object.keys(next)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => next[k]?.urls?.[0])
      .filter(Boolean);
    onImagesChange(flat);
  };

  const buildPrompt = (suggestion, variantIdx, mode) => {
    const subject = topic?.subject || "primary school";
    const grade = topic?.grade || "primary";
    const lesson = plan?.lesson_title || topic?.topic || "";
    const cfg = STYLE_MODES[mode] || STYLE_MODES[DEFAULT_MODE];
    const styleVariant = cfg.variants[variantIdx % cfg.variants.length];
    const isDiagramOrTable = mode !== "illustration";

    return `Educational ${cfg.label.toLowerCase()} for a ${grade} ${subject} lesson on "${lesson}". ` +
      `Subject of the image: ${suggestion}. ` +
      `STYLE: ${styleVariant}. ` +
      `RULES: ${cfg.rules} ` +
      (isDiagramOrTable
        ? `Accuracy is critical — labels must be spelled correctly and point to the right parts. `
        : `Context: Zimbabwean primary school setting. `) +
      `Age-appropriate for ${grade}. No watermarks, no logos. ` +
      `High clarity, suitable to project on a classroom screen or print on A4 paper.`;
  };

  // Generate N image variants in parallel for one suggestion.
  const generateBatch = async (idx, suggestion, count = VARIANTS_PER_BATCH, append = false) => {
    const mode = getMode(idx);
    setImages(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), loading: true, error: undefined, mode, urls: append ? (prev[idx]?.urls || []) : [] }
    }));
    try {
      const startVariant = append ? (images[idx]?.urls?.length || 0) : 0;
      const results = await Promise.all(
        Array.from({ length: count }, (_, k) =>
          base44.integrations.Core.GenerateImage({ prompt: buildPrompt(suggestion, startVariant + k, mode) })
            .then(r => r?.url)
            .catch(() => null)
        )
      );
      const newUrls = results.filter(Boolean);
      setImages(prev => {
        const next = {
          ...prev,
          [idx]: {
            loading: false,
            urls: append ? [...(prev[idx]?.urls || []), ...newUrls] : newUrls,
            error: newUrls.length === 0 ? "No images were generated. Please try again." : undefined,
          },
        };
        notifyParent(next);
        return next;
      });
    } catch (e) {
      setImages(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), loading: false, error: e.message || "Failed to generate" } }));
    }
  };

  if (!items?.length) return null;

  return (
    <div>
      <h3 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
        <ImageIcon className="w-4 h-4 text-primary" /> Suggested Teaching Images
      </h3>
      <div className="space-y-2">
        {items.map((it, i) => {
          const state = images[i] || {};
          const hasImages = state.urls?.length > 0;
          const mode = getMode(i);
          return (
            <div key={i} className="border border-border rounded-xl p-3 bg-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground flex-1">{it}</p>
                <button
                  onClick={() => generateBatch(i, it, VARIANTS_PER_BATCH, false)}
                  disabled={state.loading}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                >
                  {state.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : hasImages ? <RefreshCw className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {state.loading ? "Generating..." : hasImages ? `Regenerate ${VARIANTS_PER_BATCH}` : `Generate ${VARIANTS_PER_BATCH}`}
                </button>
              </div>

              {/* Style picker — illustration / textbook diagram / ZIMSEC diagram / data table */}
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(STYLE_MODES).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const active = mode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setMode(i, key)}
                      disabled={state.loading}
                      title={cfg.description}
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
                        active
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/70"
                      }`}
                    >
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{STYLE_MODES[mode].description}</p>

              {state.error && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" /> {state.error}
                </div>
              )}

              {hasImages && (
                <>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {state.urls.map((url, k) => (
                      <div key={k} className="border border-border rounded-lg overflow-hidden bg-white">
                        <img src={url} alt={`${it} — variation ${k + 1}`} className="w-full h-40 object-contain" />
                        <div className="flex items-center justify-between px-2 py-1.5 border-t border-border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Option {k + 1}</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <Download className="w-3 h-3" /> Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => generateBatch(i, it, VARIANTS_PER_BATCH, true)}
                    disabled={state.loading}
                    className="mt-2 text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Add {VARIANTS_PER_BATCH} more variations
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Images are AI-generated. Review before classroom use.</p>
    </div>
  );
}