import { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import Papa from "papaparse";
import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Download } from "lucide-react";
import { mapRow, validateRow, dedupeKey } from "@/lib/curriculumCsv";
import CurriculumPreviewTable from "@/components/curriculum/CurriculumPreviewTable";

export default function CurriculumUpload() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  const valid = useMemo(() => rows.filter(r => !errors.find(e => e.rowIndex === r._index)), [rows, errors]);

  const downloadSample = () => {
    // NOTE:
    // "Topic"    = the BROAD topic area (e.g. Numbers, Measures, Geometry).
    // "Subtopic" = the KEY SYLLABUS CONCEPT under that topic (e.g. Fractions, Decimals, Roman Numerals).
    // "Content"  = a short explanation of what the subtopic / key concept is about.
    // "SuggestedResources" = teaching / learning materials (textbooks, charts, digital tools).
    const headers = [
      "Subject", "Grade", "Topic", "Subtopic", "Content",
      "LearningObjectives", "SuggestedActivities", "SuggestedResources",
      "Competencies", "AssessmentSuggestions", "Term", "Week", "CurriculumCode"
    ];
    const sampleRows = [
      [
        "Mathematics", "Grade 5", "Numbers", "Fractions",
        "Fractions show parts of a whole. Learners identify, compare and find equivalent fractions (e.g. 1/2 = 2/4 = 4/8) using everyday Zimbabwean examples.",
        "Identify equivalent fractions; Compare equivalent fractions",
        "Fraction cards; Group matching exercises; Fraction wall demonstrations",
        "Fraction wall chart; Grade 5 Maths textbook; Paper strips; Coloured markers",
        "Critical Thinking; Problem Solving",
        "Worksheet; Oral Questions",
        "1", "4", "M5.2.3"
      ],
      [
        "Mathematics", "Grade 5", "Numbers", "Decimals",
        "Decimals are another way of showing parts of a whole using a decimal point (e.g. 0.5 = 1/2). Learners read, write and order decimal numbers up to two places.",
        "Read and write decimals up to 2 places; Order decimals from smallest to largest",
        "Money role-play (cents and dollars); Place-value card games",
        "Place-value chart; Play money; Grade 5 Maths textbook",
        "Critical Thinking; Problem Solving",
        "Worksheet; Mental maths quiz",
        "1", "5", "M5.2.4"
      ],
      [
        "English", "Grade 5", "Writing", "Descriptive Composition",
        "Writing that uses vivid words and sensory details to paint a clear picture of a person, place or event for the reader.",
        "Use vivid adjectives and similes; Structure a 3-paragraph description",
        "Picture stimulus writing; Peer editing in pairs",
        "Picture flashcards; Grade 5 English textbook; Sample descriptive passages",
        "Communication; Self-Management",
        "Marked composition; Oral presentation",
        "1", "3", "E5.3.1"
      ],
      [
        "Science", "Grade 6", "Living Things and Their Environment", "Food Chains",
        "A food chain shows how energy flows from one living thing to another, starting with producers (plants) and moving through consumers and decomposers.",
        "Define producers consumers and decomposers; Draw a simple food chain",
        "Local field walk; Draw a food chain from your home area",
        "Local environment for field walk; Grade 6 Science textbook; Chart paper; Coloured pencils",
        "Environmental Awareness; Critical Thinking",
        "Diagram drawing; Short quiz",
        "2", "1", "S6.4.1"
      ]
    ];
    const escape = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...sampleRows].map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculum_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-foreground">Super Admin Only</h1>
        <p className="text-muted-foreground mt-2 text-sm">Only super admins can upload curriculum.</p>
        <Link to="/home" className="mt-4 text-primary font-semibold text-sm underline">Go Home</Link>
      </div>
    );
  }

  const handleFile = async (file) => {
    setFileName(file.name);
    setResult(null);
    setErrors([]);
    setDuplicates([]);
    setRows([]);

    const ext = file.name.split(".").pop().toLowerCase();
    let parsedRows = [];

    if (ext === "csv") {
      await new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => { parsedRows = res.data; resolve(); },
        });
      });
    } else if (ext === "xlsx" || ext === "xls") {
      // Upload and use Base44 extract
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  Subject: { type: "string" },
                  Grade: { type: "string" },
                  Topic: { type: "string" },
                  Subtopic: { type: "string" },
                  Content: { type: "string" },
                  LearningObjectives: { type: "string" },
                  SuggestedActivities: { type: "string" },
                  SuggestedResources: { type: "string" },
                  Competencies: { type: "string" },
                  AssessmentSuggestions: { type: "string" },
                  Term: { type: "string" },
                  Week: { type: "string" },
                  CurriculumCode: { type: "string" },
                },
              },
            },
          },
        },
      });
      parsedRows = extracted?.output?.rows || [];
    } else {
      alert("Please upload a CSV or XLSX file.");
      return;
    }

    const mapped = parsedRows.map((r, i) => ({ ...mapRow(r), _index: i }));
    const errs = mapped.map((r, i) => validateRow(r, i)).filter(Boolean);

    // Check duplicates against existing records
    const existing = await base44.entities.CurriculumTopic.list("-created_date", 5000);
    const existingByKey = new Map(existing.map(e => [dedupeKey(e), e]));
    const dupes = mapped
      .filter(r => existingByKey.has(dedupeKey(r)))
      .map(r => ({ row: r, existing: existingByKey.get(dedupeKey(r)) }));

    setRows(mapped);
    setErrors(errs);
    setDuplicates(dupes);
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    let created = 0, updated = 0, skipped = 0;
    const dupeKeys = new Set(duplicates.map(d => dedupeKey(d.row)));

    for (const r of valid) {
      const { _index, ...payload } = r;
      const key = dedupeKey(payload);
      const dupe = duplicates.find(d => dedupeKey(d.row) === key);

      if (dupe) {
        if (overwriteDuplicates) {
          await base44.entities.CurriculumTopic.update(dupe.existing.id, payload).catch(() => {});
          updated++;
        } else {
          skipped++;
        }
      } else {
        await base44.entities.CurriculumTopic.create({ ...payload, is_active: true }).catch(() => {});
        created++;
      }
    }
    setResult({ created, updated, skipped, errors: errors.length });
    setImporting(false);
  };

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-5 pt-10 pb-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-white/80 text-sm mb-3"><ArrowLeft className="w-4 h-4" /> Admin</Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold">Curriculum Upload</h1>
            <p className="text-white/80 text-xs mt-1">Bulk import the official Heritage-Based Curriculum from CSV or Excel.</p>
          </div>
          <button
            onClick={downloadSample}
            className="bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Sample CSV
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {/* Drop zone */}
        <label className="block bg-card rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 text-center cursor-pointer">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="w-10 h-10 mx-auto text-primary mb-2" />
          <p className="font-bold text-foreground">Click to upload CSV or Excel</p>
          <p className="text-xs text-muted-foreground mt-1">
            Expected columns: Subject, Grade, <strong>Topic</strong> (broad area e.g. Numbers), <strong>Subtopic</strong> (key syllabus concept e.g. Fractions), <strong>Content</strong> (what the subtopic is about), LearningObjectives, SuggestedActivities, <strong>SuggestedResources</strong> (materials), Competencies, AssessmentSuggestions, Term, Week, CurriculumCode
          </p>
          {fileName && <p className="text-xs text-primary font-semibold mt-2">📄 {fileName}</p>}
        </label>

        {/* Summary */}
        {rows.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Parsed" value={rows.length} icon={<FileSpreadsheet className="w-4 h-4" />} color="bg-blue-500/10 text-blue-600" />
            <SummaryCard label="Errors" value={errors.length} icon={<AlertTriangle className="w-4 h-4" />} color="bg-red-500/10 text-red-600" />
            <SummaryCard label="Duplicates" value={duplicates.length} icon={<CheckCircle2 className="w-4 h-4" />} color="bg-amber-500/10 text-amber-600" />
          </div>
        )}

        {/* Errors list */}
        {errors.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-red-600 text-sm">⚠️ {errors.length} row(s) with errors (will be skipped)</p>
            <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
              {errors.slice(0, 20).map((e) => (
                <li key={e.rowIndex}>Row {e.rowIndex + 2}: {e.errors.join("; ")}</li>
              ))}
              {errors.length > 20 && <li>...and {errors.length - 20} more</li>}
            </ul>
          </div>
        )}

        {/* Duplicate handling */}
        {duplicates.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-amber-700 text-sm">🔁 {duplicates.length} duplicate(s) found</p>
            <label className="flex items-center gap-2 text-sm text-amber-700">
              <input type="checkbox" checked={overwriteDuplicates} onChange={(e) => setOverwriteDuplicates(e.target.checked)} />
              Overwrite existing records (otherwise duplicates will be skipped)
            </label>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <CurriculumPreviewTable rows={rows} errors={errors} duplicates={duplicates} />
        )}

        {/* Import button */}
        {rows.length > 0 && !result && (
          <button
            onClick={handleImport}
            disabled={importing || valid.length === 0}
            className="w-full bg-primary text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : `Import ${valid.length} record${valid.length !== 1 ? "s" : ""}`}
          </button>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 space-y-1">
            <p className="font-bold text-green-700">✅ Import complete</p>
            <p className="text-sm text-green-700">{result.created} created · {result.updated} updated · {result.skipped} skipped · {result.errors} errors</p>
            <Link to="/curriculum-explorer" className="text-sm font-semibold text-primary underline">View in Curriculum Explorer →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-2xl font-extrabold text-foreground mt-2">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}