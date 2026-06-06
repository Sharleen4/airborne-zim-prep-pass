import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { validateNote, validateQuestion, VALID_GRADES } from '@/utils/csvValidation';
import { Button } from '@/components/ui/button';
import * as Papa from 'papaparse';
import BulkCSVReviewPanel from '@/components/admin/BulkCSVReviewPanel';

export default function BulkCSVUploader() {
  const [uploadType, setUploadType] = useState('notes');
  const [file, setFile] = useState(null);
  const [gradeLevel, setGradeLevel] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    Promise.all([base44.entities.Subject.list(), base44.entities.Topic.list()])
      .then(([subs, tps]) => { setSubjects(subs); setTopics(tps); });
  }, []);

  const filteredSubjects = gradeLevel ? subjects.filter(s => s.grade === gradeLevel) : subjects;
  const selectedSubject = subjects.find(s => s.id === subjectId);

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    if (uploadType === 'notes') {
      const headers = ['topic_name', 'overview', 'key_definitions', 'key_concepts', 'zimbabwe_examples', 'important_facts', 'common_mistakes', 'summary', 'exam_tips'];
      const sampleRow = [
        'Photosynthesis',
        'Process plants use to make food using sunlight',
        'Photosynthesis: making food. Chlorophyll: green pigment.',
        'Plants absorb sunlight. Take CO2 from air. Water from roots.',
        'Tobacco farms in Mvurwi. Maize in Mashonaland.',
        'Need sunlight, water, CO2. Happens in leaves.',
        'Confusing with respiration. Not all plants are green.',
        'Sunlight + water + CO2 → glucose + oxygen.',
        'State word equation. Mention chlorophyll.',
      ];
      const csv = [headers, sampleRow].map(row => row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadCSV(csv, 'notes_template.csv');
    } else {
      const headers = ['topic_name', 'question_text', 'comprehension_passage', 'optA', 'optB', 'optC', 'optD', 'correct_answer', 'explanation', 'difficulty', 'question_type'];
      const sampleRows = [
        ['Photosynthesis', 'What is photosynthesis?', '', 'Breaking down glucose', 'Making glucose using sunlight', 'Storing energy', 'Absorbing water', 'B', 'Plants use sunlight to make glucose', 'Easy', 'mcq'],
        ['Comprehension', 'What did Chipo carry to school?', 'Chipo woke up early. She packed her blue bag.', 'A red bag', 'A yellow box', 'A blue bag', 'A brown basket', 'C', 'The passage states Chipo packed her blue bag', 'Easy', 'comprehension'],
      ];
      const csv = [headers, ...sampleRows].map(row => row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadCSV(csv, 'questions_template.csv');
    }
  };

  const transformNotes = (rows) => {
    return rows.map((row, idx) => {
      const note = {
        id: `note-${idx}`,
        subject_id: subjectId,
        topic_name_input: row.topic_name?.trim() || '',
        overview: row.overview?.trim() || '',
        key_definitions: row.key_definitions?.trim() || '',
        key_concepts: row.key_concepts?.trim() || '',
        zimbabwe_examples: row.zimbabwe_examples?.trim() || '',
        important_facts: row.important_facts?.trim() || '',
        common_mistakes: row.common_mistakes?.trim() || '',
        summary: row.summary?.trim() || '',
        exam_tips: row.exam_tips?.trim() || '',
      };
      note._validationErrors = validateNote(note);
      return note;
    });
  };

  const transformQuestions = (rows) => {
    return rows.map((row, idx) => {
      const questionType = (row.question_type?.trim() || 'mcq').toLowerCase();
      const isMCQ = questionType === 'mcq' || questionType === 'comprehension';
      let options = [];
      if (isMCQ) {
        options = [
          { label: 'A', text: row.optA?.trim() || '' },
          { label: 'B', text: row.optB?.trim() || '' },
          { label: 'C', text: row.optC?.trim() || '' },
          { label: 'D', text: row.optD?.trim() || '' },
        ].filter(o => o.text);
      }
      const question = {
        id: `q-${idx}`,
        question_text: row.question_text?.trim() || '',
        comprehension_passage: row.comprehension_passage?.trim() || '',
        question_type: questionType,
        options,
        correct_answer: (row.correct_answer?.trim() || '').toUpperCase(),
        explanation: row.explanation?.trim() || '',
        difficulty: row.difficulty?.trim() || 'Standard',
        marks: 1,
        subject_id: subjectId,
        topic_name_input: row.topic_name?.trim() || '',
      };
      question._validationErrors = validateQuestion(question);
      return question;
    });
  };

  const parseCSV = () => {
    if (!file) return;
    setStatus('parsing');
    setErrorMsg('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data?.length) {
          setErrorMsg('CSV file is empty or invalid.');
          setStatus('error');
          return;
        }
        const data = uploadType === 'notes' ? transformNotes(results.data) : transformQuestions(results.data);
        const errCount = data.filter(d => d._validationErrors?.length > 0).length;
        if (errCount > 0) setErrorMsg(`${errCount} row(s) have validation issues — review and fix below.`);
        setParsedData(data);
        setStatus('review');
      },
      error: (err) => {
        setErrorMsg(`CSV parse error: ${err.message}`);
        setStatus('error');
      },
    });
  };

  const reset = () => { setStatus('idle'); setFile(null); setErrorMsg(''); setParsedData([]); };

  if (status === 'review' && parsedData.length > 0) {
    return (
      <BulkCSVReviewPanel
        uploadType={uploadType}
        data={parsedData}
        subjectId={subjectId}
        subjectName={selectedSubject?.name || ''}
        onSave={() => setStatus('done')}
        onBack={() => setStatus('idle')}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="font-bold text-lg">Bulk CSV Upload</h2>
        <p className="text-muted-foreground text-xs mt-1">Upload notes or questions in bulk. Items save as drafts (pending review) and can be approved in the Review tab.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        {/* Type selector */}
        <div>
          <p className="text-sm font-semibold mb-2">Upload Type</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setUploadType('notes')}
              className={`p-3 rounded-xl border-2 text-left transition-colors ${uploadType === 'notes' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <p className="text-sm font-semibold">📚 Revision Notes</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Notes per topic with AI images</p>
            </button>
            <button onClick={() => setUploadType('questions')}
              className={`p-3 rounded-xl border-2 text-left transition-colors ${uploadType === 'questions' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <p className="text-sm font-semibold">❓ Questions</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">MCQ & comprehension</p>
            </button>
          </div>
        </div>

        {/* Template */}
        <Button onClick={downloadTemplate} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Download {uploadType === 'notes' ? 'Notes' : 'Questions'} Template
        </Button>

        {/* Grade / Subject / Default Topic */}
        <div className="space-y-2">
          <select value={gradeLevel} onChange={e => { setGradeLevel(e.target.value); setSubjectId(''); }}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
            <option value="">All grades</option>
            {VALID_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
            <option value="">Select subject *</option>
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
          </select>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-[11px] text-blue-700 leading-relaxed">
            ✨ <strong>Auto topic creation:</strong> Each row's <code>topic_name</code> will be matched to an existing topic in the selected subject. If no match is found, a new topic will be created automatically when you save.
          </div>
        </div>

        {/* File drop */}
        <div onClick={() => status !== 'parsing' && document.getElementById('bulk-csv-input').click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
          <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">{file ? file.name : 'Click to upload CSV file'}</p>
          <input id="bulk-csv-input" type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files[0])} />
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" /> Saved as drafts! See the Review tab to approve.
          </div>
        )}

        {/* Status hints */}
        {!subjectId && <p className="text-[11px] text-amber-600">⚠️ Please select a subject before uploading.</p>}
        {subjectId && !file && <p className="text-[11px] text-amber-600">⚠️ Please upload a CSV file.</p>}

        <div className="flex gap-2">
          <Button onClick={parseCSV} disabled={!file || !subjectId || status === 'parsing'} className="flex-1">
            {status === 'parsing'
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing...</>
              : <><Upload className="w-4 h-4 mr-2" />Parse & Review CSV</>}
          </Button>
          {status !== 'idle' && <Button variant="outline" onClick={reset}>Reset</Button>}
        </div>
      </div>
    </div>
  );
}