import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Sparkles, CheckCircle, AlertCircle, Copy } from "lucide-react";

export default function ContentImporter() {
  const [grade, setGrade] = useState("Grade 6");
  const [subject, setSubject] = useState("Social Sciences");
  const [content, setContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleImport = async () => {
    if (!grade || !subject || !content.trim()) {
      setResult({ success: false, message: "Please fill in all fields" });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const res = await base44.functions.invoke("importSocialSciencesContent", {
        grade,
        subjectName: subject,
        content: content.trim(),
      });

      setResult({
        success: true,
        message: res.data.message,
        details: `Topics: ${res.data.topics_created} | Notes: ${res.data.notes_created}`,
      });

      setContent("");
    } catch (e) {
      setResult({
        success: false,
        message: e.response?.data?.error || e.message || "Import failed",
      });
    }

    setImporting(false);
  };

  const handlePasteExample = () => {
    const example = `TOPIC 1: IDENTITY
This topic helps learners understand family, community, culture and the importance of preserving identity.

UNIT 1: COMMUNITY CONTRIBUTION TO THE FAMILY
Meaning of a Community
A community is a group of people living together in one area who help one another.

How the Community Helps the Family
Teachers educate children.
Nurses and doctors provide health care.
Churches provide spiritual guidance.

Importance of Community Support
Community support helps families to feel safe and build cooperation.

UNIT 2: CULTURAL VALUES
In the pre-colonial era, mothers and fathers had special duties.
Roles of Mothers: cooking, caring, teaching girls household duties.
Roles of Fathers: providing food, protecting, teaching boys life skills.`;

    setContent(example);
  };

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="bg-gradient-to-br from-violet-500 to-primary rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Content Framework Importer</p>
            <p className="text-white/70 text-xs">Paste structured content (TOPIC/UNIT format) to auto-generate topics & notes</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        {/* Grade & Subject */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Grade</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
            >
              {["Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Social Sciences"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
            />
          </div>
        </div>

        {/* Content textarea */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-muted-foreground">Content (TOPIC/UNIT format)</label>
            <button
              onClick={handlePasteExample}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Paste example
            </button>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your content framework here. Structure should be:&#10;TOPIC 1: Title&#10;UNIT 1: ...&#10;UNIT 2: ...&#10;TOPIC 2: ..."
            className="w-full border border-border rounded-xl px-3 py-3 text-sm h-64 resize-none bg-background text-foreground font-mono text-xs"
          />
          {content && (
            <button
              onClick={copyContent}
              className="mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">📋 Format Guide:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li><strong>TOPIC N: Title</strong> — Major section (e.g., "TOPIC 1: IDENTITY")</li>
            <li><strong>UNIT N: Title</strong> — Subsection with content below</li>
            <li>Content under each UNIT is extracted and auto-structured by AI</li>
            <li>All notes created as <strong>drafts</strong> — review &amp; approve in Review tab</li>
          </ul>
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={importing || !content.trim()}
          className="w-full bg-primary text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
        >
          {importing ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing & parsing...</>
          ) : (
            <><Upload className="w-4 h-4" />Import & Generate Notes</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
            {result.success ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-green-800">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-green-700 mt-1">{result.details}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{result.message}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}