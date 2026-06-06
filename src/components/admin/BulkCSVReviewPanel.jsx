import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, Trash2, Save, Loader2, AlertCircle, CheckCircle, Pencil, Image as ImageIcon, Sparkles, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { validateNote, validateQuestion } from '@/utils/csvValidation';

const NOTE_FIELDS = [
  { key: 'title', label: 'Title', component: 'input' },
  { key: 'overview', label: 'Overview', rows: 3 },
  { key: 'key_definitions', label: 'Key Definitions', rows: 3 },
  { key: 'key_concepts', label: 'Key Concepts', rows: 3 },
  { key: 'zimbabwe_examples', label: 'Examples', rows: 3 },
  { key: 'important_facts', label: 'Important Facts', rows: 3 },
  { key: 'common_mistakes', label: 'Common Mistakes', rows: 3 },
  { key: 'summary', label: 'Summary', rows: 3 },
  { key: 'exam_tips', label: 'Exam Tips', rows: 3 },
];

function NoteEditDialog({ note, onSave, onCancel }) {
  const [data, setData] = useState(note);
  return (
    <Dialog open={!!note} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit Note</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {NOTE_FIELDS.map(({ key, label, component, rows }) => (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              {component === 'input'
                ? <Input value={data[key] || ''} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))} />
                : <Textarea value={data[key] || ''} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))} rows={rows} />}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(data)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BulkCSVReviewPanel({ uploadType, data, subjectId, subjectName, onSave, onBack }) {
  const [items, setItems] = useState(data.map((item, i) => ({ ...item, expanded: false, id: item.id || `item-${i}` })));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const updateItem = (id, patch) => setItems(prev => prev.map(it => {
    if (it.id !== id) return it;
    const updated = { ...it, ...patch };
    updated._validationErrors = uploadType === 'notes' ? validateNote(updated) : validateQuestion(updated);
    return updated;
  }));
  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id));
  const toggle = (id) => setItems(prev => prev.map(it => it.id === id ? { ...it, expanded: !it.expanded } : it));

  const handleGenerateImage = async (item) => {
    updateItem(item.id, { generatingImage: true });
    try {
      const concepts = [item.key_concepts, item.key_definitions, item.important_facts].filter(Boolean).join('. ').substring(0, 400);
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Clean, kid-friendly educational illustration for "${item.title}" in ${subjectName || 'primary school'}. Illustrate: ${concepts}. Bright, colorful, simple, white background, no text labels.`,
      });
      updateItem(item.id, { image_url: result?.url || null, generatingImage: false });
    } catch (e) {
      updateItem(item.id, { generatingImage: false });
    }
  };

  const handleGenerateAllImages = async () => {
    const targets = items.filter(it => !it.image_url);
    if (!targets.length) return;
    setGeneratingAll(true);
    setProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      await handleGenerateImage(targets[i]);
      setProgress({ done: i + 1, total: targets.length });
    }
    setGeneratingAll(false);
  };

  const invalidCount = items.filter(it => it._validationErrors?.length > 0).length;

  const handleSaveAll = async () => {
    if (invalidCount > 0) {
      setSaveError(`${invalidCount} item(s) have errors. Fix them before saving.`);
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    setProgress({ done: 0, total: items.length });

    // Build topic name → id cache from existing topics for this subject
    const existingTopics = await base44.entities.Topic.filter({ subject_id: subjectId });
    const topicCache = {};
    existingTopics.forEach(t => { topicCache[t.name.trim().toLowerCase()] = t.id; });

    const resolveTopicId = async (topicName) => {
      const key = (topicName || '').trim().toLowerCase();
      if (!key) return null;
      if (topicCache[key]) return topicCache[key];
      // Auto-create new topic
      const created = await base44.entities.Topic.create({
        subject_id: subjectId,
        name: topicName.trim(),
        is_active: true,
      });
      topicCache[key] = created.id;
      return created.id;
    };

    let saveCount = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const topicId = await resolveTopicId(item.topic_name_input);
        const title = item.topic_name_input || 'Untitled';
        if (uploadType === 'notes') {
          const payload = {
            subject_id: subjectId,
            topic_id: topicId,
            overview: item.overview ? `**${title}**\n\n${item.overview}` : title,
            key_definitions: item.key_definitions || '',
            key_concepts: item.key_concepts || '',
            zimbabwe_examples: item.zimbabwe_examples || '',
            important_facts: item.important_facts || '',
            common_mistakes: item.common_mistakes || '',
            summary: item.summary || '',
            exam_tips: item.exam_tips || '',
            is_active: false,
            is_ai_generated: true,
            review_status: 'pending_review',
          };
          if (item.image_url) payload.image_url = item.image_url;
          await base44.entities.Note.create(payload);
        } else {
          await base44.entities.Question.create({
            question_text: item.question_text,
            comprehension_passage: item.comprehension_passage || '',
            question_type: item.question_type,
            options: item.options || [],
            correct_answer: item.correct_answer || '',
            explanation: item.explanation || '',
            difficulty: item.difficulty || 'Standard',
            marks: item.marks || 1,
            subject_id: subjectId,
            topic_id: topicId,
            is_active: false,
            review_status: 'pending_review',
          });
        }
        saveCount++;
      } catch (err) {
        setSaveError(`Failed to save row ${i + 1}: ${err.message}`);
      }
      setProgress({ done: i + 1, total: items.length });
    }
    if (saveCount > 0) {
      setSaveSuccess(true);
      setTimeout(() => onSave(), 1500);
    }
    setSaving(false);
  };

  const itemsWithoutImage = uploadType === 'notes' ? items.filter(it => !it.image_url).length : 0;

  return (
    <div className="space-y-4">
      <div className={`border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap ${invalidCount > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/20'}`}>
        <div>
          <p className="font-semibold text-sm">{items.length} {uploadType === 'notes' ? 'note(s)' : 'question(s)'} ready</p>
          {invalidCount > 0
            ? <p className="text-xs text-destructive">{invalidCount} item(s) have errors</p>
            : <p className="text-xs text-muted-foreground">All valid. Will save as drafts (pending review).</p>}
          {(saving || generatingAll) && progress.total > 0 && (
            <p className="text-xs text-primary mt-1">{progress.done} / {progress.total}</p>
          )}
        </div>
        <div className="flex gap-2">
          {uploadType === 'notes' && itemsWithoutImage > 0 && (
            <Button onClick={handleGenerateAllImages} disabled={generatingAll || saving} size="sm" variant="outline">
              {generatingAll ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-1" />Generate All Images ({itemsWithoutImage})</>}
            </Button>
          )}
          <Button onClick={handleSaveAll} disabled={saving || generatingAll || items.length === 0} size="sm">
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-1" />Save All as Drafts</>}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" /> {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="flex gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" /> Saved! Find them in the Review tab.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`bg-card border rounded-xl ${item._validationErrors?.length > 0 ? 'border-destructive/40' : 'border-border'}`}>
            <div className={`flex items-center gap-3 px-4 py-3 ${item._validationErrors?.length > 0 ? 'bg-destructive/5' : ''}`}>
              <button onClick={() => toggle(item.id)}>
                {item.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item._validationErrors?.length > 0
                    ? <ShieldAlert className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    : <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                  <p className="font-semibold text-sm truncate">
                    {uploadType === 'notes' ? (item.topic_name_input || 'No topic') : item.question_text}
                  </p>
                </div>
                {item._validationErrors?.length > 0 && (
                  <p className="text-xs text-destructive mt-0.5">{item._validationErrors.length} error(s)</p>
                )}
              </div>
              {uploadType === 'notes' && item.image_url && <ImageIcon className="w-4 h-4 text-green-600 flex-shrink-0" />}
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => removeItem(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {item.expanded && (
              <div className="p-4 border-t space-y-3">
                {item._validationErrors?.length > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    {item._validationErrors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">• <strong>{e.field}:</strong> {e.message}</p>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Topic</label>
                  <Input
                    value={item.topic_name_input || ''}
                    onChange={e => updateItem(item.id, { topic_name_input: e.target.value })}
                    placeholder="e.g. Photosynthesis"
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">If this topic doesn't exist in the subject yet, it will be created automatically when you save.</p>
                </div>

                {uploadType === 'notes' ? (
                  <div className="space-y-2 text-xs">
                    {NOTE_FIELDS.filter(f => f.key !== 'title').map(({ key, label }) => item[key] ? (
                      <div key={key}>
                        <label className="font-medium text-muted-foreground">{label}</label>
                        <p className="whitespace-pre-line">{item[key]}</p>
                      </div>
                    ) : null)}

                    <div className="border rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-primary" /> Topic Image
                        </span>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleGenerateImage(item)} disabled={item.generatingImage}>
                          {item.generatingImage
                            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                            : <><Sparkles className="w-3 h-3 mr-1" />{item.image_url ? 'Regenerate' : 'Generate'}</>}
                        </Button>
                      </div>
                      {item.image_url
                        ? <img src={item.image_url} alt="" className="w-full rounded-lg max-h-48 object-contain bg-white" />
                        : <p className="text-[11px] text-muted-foreground">No image yet. Click Generate to create one with AI.</p>}
                    </div>

                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingNote(item)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {item.comprehension_passage && (
                      <div className="bg-muted/50 p-2 rounded text-muted-foreground italic">{item.comprehension_passage}</div>
                    )}
                    <p className="font-medium">{item.question_text}</p>
                    {item.options?.length > 0 && item.options.map((opt, i) => (
                      <p key={i} className={opt.label === item.correct_answer ? 'text-green-700 font-semibold' : ''}>{opt.label}. {opt.text}</p>
                    ))}
                    {item.explanation && <p className="text-muted-foreground italic">💡 {item.explanation}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {item.correct_answer && <Badge variant="outline" className="text-[10px]">Answer: {item.correct_answer}</Badge>}
                      {item.difficulty && <Badge variant="outline" className="text-[10px]">{item.difficulty}</Badge>}
                      {item.question_type && <Badge variant="outline" className="text-[10px]">{item.question_type}</Badge>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={onBack}>← Back to Upload</Button>

      {editingNote && (
        <NoteEditDialog
          note={editingNote}
          onSave={(updated) => { updateItem(editingNote.id, updated); setEditingNote(null); }}
          onCancel={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}