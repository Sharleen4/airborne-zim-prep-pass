import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Download, X, AlertTriangle, CheckCircle, XCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { TEMPLATES, buildTemplateCSV, parseCSV, transformRow, validateRow, GRADES } from "./englishCsvSchemas";

const ENTITIES = [
  { key: "LearningCard", label: "Learning Cards", icon: "🎴", desc: "Flashcards, MCQs, drag-order, matching, fill-in-blank" },
  { key: "ReadingPassage", label: "Reading Passages", icon: "📖", desc: "Short passages for comprehension exercises" },
  { key: "Poem", label: "Poems", icon: "🎭", desc: "Poems with vocabulary for poetry analysis" },
  { key: "LetterTemplate", label: "Letter Templates", icon: "✉️", desc: "Sample letters for arrange-and-fill activities" },
];

export default function EnglishCsvUploader() {
  const [entity, setEntity] = useState("LearningCard");
  const [showTemplate, setShowTemplate] = useState(false);
  const [items, setItems] = useState([]);     // [{ data, errors, _expanded }]
  const [headerErrors, setHeaderErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const tpl = TEMPLATES[entity];
  const validCount = items.filter(i => i.errors.length === 0).length;
  const invalidCount = items.length - validCount;

  const reset = () => {
    setItems([]); setHeaderErrors([]); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = buildTemplateCSV(entity);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${entity}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    reset();
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result);
      const missing = tpl.headers.filter(h => !headers.includes(h));
      if (missing.length) {
        setHeaderErrors([`Missing required columns: ${missing.join(", ")}`]);
        return;
      }
      const built = rows.map(row => {
        const data = transformRow(entity, row);
        const errors = validateRow(entity, data);
        return { data, errors, _expanded: false };
      });
      setItems(built);
    };
    reader.readAsText(f);
  };

  const updateField = (idx, key, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const data = { ...it.data, [key]: val };
      const errors = validateRow(entity, data);
      return { ...it, data, errors };
    }));
  };

  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const toggleRow = (idx) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, _expanded: !it._expanded } : it));

  const saveValid = async () => {
    const valid = items.filter(i => i.errors.length === 0);
    if (valid.length === 0) return;
    setSaving(true);
    let saved = 0, failed = 0;
    for (const it of valid) {
      try {
        await base44.entities[entity].create(it.data);
        saved++;
      } catch {
        failed++;
      }
    }
    setResult({ saved, failed, skipped: items.length - valid.length });
    setItems([]);
    setSaving(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">English Content Uploader</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bulk-import lesson content for the new English module. Each row is validated against the syllabus schema before saving.
        </p>
      </div>

      {/* Entity picker */}
      <div className="grid grid-cols-2 gap-2">
        {ENTITIES.map(e => (
          <button
            key={e.key}
            onClick={() => { setEntity(e.key); reset(); }}
            className={`p-3 rounded-2xl border-2 text-left transition-all ${entity === e.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
          >
            <div className="text-xl mb-1">{e.icon}</div>
            <p className="font-bold text-sm text-foreground">{e.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{e.desc}</p>
          </button>
        ))}
      </div>

      {/* Template + upload */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">CSV Template</p>
          <button onClick={() => setShowTemplate(v => !v)} className="text-xs text-muted-foreground flex items-center gap-1">
            {showTemplate ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showTemplate ? "Hide" : "View columns"}
          </button>
        </div>

        {showTemplate && (
          <div className="bg-secondary/40 rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground truncate">{tpl.headers.join(", ")}</span>
              <button onClick={downloadTemplate} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 flex-shrink-0">
                <Download className="w-3 h-3" /> Download
              </button>
            </div>
            <div className="px-3 py-2 text-[11px] text-muted-foreground space-y-1">
              <p>💡 Use <code className="bg-card px-1 rounded">|</code> to separate items in pipe fields.</p>
              <p>💡 Options: <code className="bg-card px-1 rounded">A:Walk|B:Walks|C:Walking</code></p>
              <p>💡 Pairs: <code className="bg-card px-1 rounded">big=large|fast=quick</code></p>
              <p>💡 Letter parts must include greeting / body / closing for syllabus alignment.</p>
            </div>
          </div>
        )}

        {items.length === 0 && headerErrors.length === 0 && !result && (
          <label className="block">
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
              <p className="text-xs text-muted-foreground mt-1">{ENTITIES.find(e => e.key === entity)?.label} format</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </div>
          </label>
        )}

        {headerErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1 text-destructive font-semibold text-xs">
              <XCircle className="w-3.5 h-3.5" /> CSV format error
            </div>
            {headerErrors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
            <button onClick={reset} className="text-xs text-muted-foreground underline mt-1">Try again</button>
          </div>
        )}
      </div>

      {/* Review */}
      {items.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Review &amp; Validate ({items.length})</p>
            <button onClick={reset}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 text-center">
              <p className="text-lg font-extrabold text-green-700">{validCount}</p>
              <p className="text-[10px] text-green-600 font-semibold">Valid — ready to save</p>
            </div>
            <div className={`rounded-xl px-3 py-2 text-center border ${invalidCount > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-secondary border-border"}`}>
              <p className={`text-lg font-extrabold ${invalidCount > 0 ? "text-amber-700" : "text-muted-foreground"}`}>{invalidCount}</p>
              <p className={`text-[10px] font-semibold ${invalidCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>Need fixing</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {items.map((it, idx) => {
              const ok = it.errors.length === 0;
              return (
                <div key={idx} className={`rounded-xl border overflow-hidden ${ok ? "border-green-300/50 bg-green-50/30" : "border-amber-300/60 bg-amber-50/30"}`}>
                  <div className="flex items-start gap-2 px-3 py-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        Row {idx + 1}: {it.data.title || "(no title)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {it.data.grade || "no grade"}
                        {it.data.skill ? ` · ${it.data.skill}` : ""}
                        {it.data.card_type ? ` · ${it.data.card_type}` : ""}
                        {it.data.letter_type ? ` · ${it.data.letter_type}` : ""}
                      </p>
                      {!ok && (
                        <ul className="mt-1 space-y-0.5">
                          {it.errors.map((e, i) => (
                            <li key={i} className="text-[11px] text-amber-700">• {e}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleRow(idx)} className="text-muted-foreground p-1">
                        {it._expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {it._expanded && (
                    <div className="border-t border-border bg-card/60 p-3 grid grid-cols-2 gap-2 text-xs">
                      {/* Common quick-fix fields */}
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Grade</label>
                        <select
                          value={it.data.grade || ""}
                          onChange={e => updateField(idx, "grade", e.target.value)}
                          className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5"
                        >
                          <option value="">— select —</option>
                          {GRADES.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Title</label>
                        <input
                          value={it.data.title || ""}
                          onChange={e => updateField(idx, "title", e.target.value)}
                          className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5"
                        />
                      </div>

                      {entity === "LearningCard" && (
                        <>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Explanation</label>
                            <textarea
                              value={it.data.explanation || ""}
                              onChange={e => updateField(idx, "explanation", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5 h-12 resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Front</label>
                            <input value={it.data.front || ""} onChange={e => updateField(idx, "front", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Back</label>
                            <input value={it.data.back || ""} onChange={e => updateField(idx, "back", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Correct Answer</label>
                            <input value={it.data.correct_answer || ""} onChange={e => updateField(idx, "correct_answer", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5" />
                          </div>
                        </>
                      )}

                      {entity === "ReadingPassage" && (
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Passage</label>
                          <textarea value={it.data.passage || ""} onChange={e => updateField(idx, "passage", e.target.value)}
                            className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5 h-24 resize-none" />
                        </div>
                      )}

                      {entity === "Poem" && (
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Poem Text (use real line breaks)</label>
                          <textarea value={it.data.text || ""} onChange={e => updateField(idx, "text", e.target.value)}
                            className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground mt-0.5 h-32 resize-none font-mono" />
                        </div>
                      )}

                      {entity === "LetterTemplate" && (
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Parts ({it.data.parts?.length || 0}) — must include greeting / body / closing
                          </label>
                          <ul className="mt-1 space-y-0.5">
                            {(it.data.parts || []).map((p, i) => (
                              <li key={i} className="text-[11px] text-foreground">
                                <span className="font-bold capitalize">{p.label}:</span> {p.text.slice(0, 80)}{p.text.length > 80 ? "…" : ""}
                              </li>
                            ))}
                          </ul>
                          <p className="text-[10px] text-muted-foreground mt-1">Edit the CSV to change parts, then re-upload.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
            📋 Only <strong>{validCount}</strong> valid row(s) will be saved. Rows with errors are skipped — fix the CSV and re-upload, or correct fields above.
          </div>

          <button
            onClick={saveValid}
            disabled={saving || validCount === 0}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving {validCount}...</>
              : <><FileText className="w-4 h-4" /> Save {validCount} {entity}{validCount !== 1 ? "s" : ""}</>}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{result.saved} {entity}{result.saved !== 1 ? "s" : ""} saved</p>
              {result.skipped > 0 && <p className="text-xs text-amber-700 mt-0.5">⚠️ {result.skipped} row(s) skipped due to validation errors</p>}
              {result.failed > 0 && <p className="text-xs text-red-600 mt-0.5">❌ {result.failed} failed to save</p>}
            </div>
          </div>
          <button onClick={reset} className="w-full border border-border text-sm font-medium py-2.5 rounded-xl text-muted-foreground hover:bg-secondary">
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}