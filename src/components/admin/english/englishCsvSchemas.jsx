// Schemas, templates, parsers and validators for the English content CSV uploader.
// Keep this lightweight and dependency-free so the uploader can validate fully client-side.

export const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export const SKILL_VALUES = [
  "comprehension","composition","grammar","vocabulary","synonyms","antonyms",
  "similes","adjectives","parts_of_speech","poetry","summary","letter_writing",
  "reading_fluency","sentence_construction","functional_writing"
];

export const CARD_TYPES = [
  "flashcard","match_pairs","fill_blank","mcq","true_false",
  "drag_order","sentence_correction","tap_word"
];

export const LETTER_TYPES = ["informal","formal","friendly","thank_you","invitation"];

// ─── Templates ────────────────────────────────────────────────────────────
export const TEMPLATES = {
  LearningCard: {
    headers: ["grade","skill","card_type","title","explanation","example","front","back","options_pipe","correct_answer","items_order_pipe","pairs_pipe","feedback_correct","feedback_incorrect","xp_reward","order"],
    sample: [
      ["Grade 5","vocabulary","flashcard","Meaning of 'brave'","A brave person is not afraid.","Tendai was brave when he helped the lost child.","brave","not afraid","","","","","Correct! Brave means not afraid.","Try again — brave means not afraid.","5","1"],
      ["Grade 5","grammar","mcq","Choose the correct verb","Verbs are action words.","She ___ to school every day.","","","A:walk|B:walks|C:walking|D:walked","B","","","Yes! 'She walks' is correct.","Remember to add -s for she/he/it.","5","2"],
      ["Grade 6","sentence_construction","drag_order","Build the sentence","Arrange the words to make a correct sentence.","","","","","","Chipo|is|reading|a|book","","Great job!","Try again — start with the subject.","5","3"],
      ["Grade 5","synonyms","match_pairs","Match the synonyms","Synonyms mean the same thing.","","","","","","","big=large|happy=glad|fast=quick|small=tiny","Correct matches!","Some pairs are wrong — try again.","5","4"],
    ],
  },
  ReadingPassage: {
    headers: ["grade","title","passage","word_count"],
    sample: [
      ["Grade 5","A Day at the Market","Chipo went to Mbare Musika early in the morning. The market was busy. She bought tomatoes, sadza meal and rape leaves. On her way home she met her friend Tariro. They walked home together happily.","45"],
    ],
  },
  Poem: {
    headers: ["grade","title","author","text","theme","vocabulary_pipe"],
    sample: [
      ["Grade 6","My Beautiful Zimbabwe","Anonymous","Land of stones and shining sun,\nVictoria Falls forever runs.\nGreen tobacco fields so wide,\nZimbabwe fills my heart with pride.","Patriotism","tobacco=plant grown in Zimbabwe|patriotism=love for one's country"],
    ],
  },
  LetterTemplate: {
    headers: ["grade","letter_type","title","scenario","parts_pipe"],
    sample: [
      ["Grade 7","informal","Letter to a friend","Write a letter to your friend Tendai about your school trip.","address:123 Samora Machel Ave, Harare|date:10 May 2026|greeting:Dear Tendai,|body:Last week our class went to Great Zimbabwe...|closing:Your friend,|signature:Chipo"],
    ],
  },
};

// ─── CSV parser (RFC 4180 minimal) ────────────────────────────────────────
export function parseCSV(text) {
  const records = [];
  let fields = [], cur = "", inQ = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      cur += ch; i++; continue;
    }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ',') { fields.push(cur); cur = ""; i++; continue; }
    if (ch === '\r' && text[i + 1] === '\n') {
      fields.push(cur); records.push(fields); fields = []; cur = ""; i += 2; continue;
    }
    if (ch === '\n') { fields.push(cur); records.push(fields); fields = []; cur = ""; i++; continue; }
    cur += ch; i++;
  }
  if (cur || fields.length) { fields.push(cur); records.push(fields); }

  const trimmed = records.filter(r => r.some(v => v && v.trim()));
  if (trimmed.length < 2) return { headers: [], rows: [] };
  const headers = trimmed[0].map(h => h.trim());
  const rows = trimmed.slice(1).map(vals => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

export function buildTemplateCSV(entity) {
  const t = TEMPLATES[entity];
  if (!t) return "";
  const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [t.headers, ...t.sample].map(r => r.map(escape).join(",")).join("\n");
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function parsePipeList(val) {
  if (!val) return [];
  return String(val).split("|").map(s => s.trim()).filter(Boolean);
}
function parseOptions(val) {
  // Format: "A:text|B:text|C:text|D:text"
  return parsePipeList(val).map(p => {
    const [label, ...rest] = p.split(":");
    return { label: (label || "").trim(), text: rest.join(":").trim() };
  }).filter(o => o.label && o.text);
}
function parsePairs(val) {
  // Format: "left=right|left=right"
  return parsePipeList(val).map(p => {
    const [left, ...rest] = p.split("=");
    return { left: (left || "").trim(), right: rest.join("=").trim() };
  }).filter(p => p.left && p.right);
}
function parseLetterParts(val) {
  // Format: "label:text|label:text"
  return parsePipeList(val).map(p => {
    const [label, ...rest] = p.split(":");
    return { label: (label || "").trim(), text: rest.join(":").trim() };
  }).filter(p => p.label && p.text);
}
function parseVocab(val) {
  // Format: "word=meaning|word=meaning"
  return parsePipeList(val).map(p => {
    const [word, ...rest] = p.split("=");
    return { word: (word || "").trim(), meaning: rest.join("=").trim() };
  }).filter(p => p.word && p.meaning);
}

// ─── Per-entity transformers + validators ─────────────────────────────────
export function transformRow(entity, row) {
  if (entity === "LearningCard") {
    return {
      grade: row.grade?.trim() || "",
      skill: row.skill?.trim() || "",
      card_type: row.card_type?.trim() || "flashcard",
      title: row.title?.trim() || "",
      explanation: row.explanation?.trim() || "",
      example: row.example?.trim() || "",
      front: row.front?.trim() || "",
      back: row.back?.trim() || "",
      options: parseOptions(row.options_pipe),
      correct_answer: row.correct_answer?.trim() || "",
      items_order: parsePipeList(row.items_order_pipe),
      pairs: parsePairs(row.pairs_pipe),
      feedback_correct: row.feedback_correct?.trim() || "",
      feedback_incorrect: row.feedback_incorrect?.trim() || "",
      xp_reward: Number(row.xp_reward) || 5,
      order: Number(row.order) || 0,
      is_active: true,
    };
  }
  if (entity === "ReadingPassage") {
    const passage = row.passage?.trim() || "";
    const wc = Number(row.word_count) || passage.split(/\s+/).filter(Boolean).length;
    return {
      grade: row.grade?.trim() || "",
      title: row.title?.trim() || "",
      passage,
      word_count: wc,
      question_ids: [],
      is_active: true,
    };
  }
  if (entity === "Poem") {
    return {
      grade: row.grade?.trim() || "",
      title: row.title?.trim() || "",
      author: row.author?.trim() || "",
      text: row.text?.trim() || "",
      theme: row.theme?.trim() || "",
      vocabulary: parseVocab(row.vocabulary_pipe),
      question_ids: [],
      is_active: true,
    };
  }
  if (entity === "LetterTemplate") {
    return {
      grade: row.grade?.trim() || "",
      letter_type: row.letter_type?.trim() || "informal",
      title: row.title?.trim() || "",
      scenario: row.scenario?.trim() || "",
      parts: parseLetterParts(row.parts_pipe),
      is_active: true,
    };
  }
  return {};
}

export function validateRow(entity, item) {
  const errs = [];
  // Common
  if (!item.grade) errs.push("grade is required");
  else if (!GRADES.includes(item.grade)) errs.push(`grade must be one of: ${GRADES.join(", ")}`);
  if (!item.title) errs.push("title is required");

  if (entity === "LearningCard") {
    if (!item.skill) errs.push("skill is required");
    else if (!SKILL_VALUES.includes(item.skill)) errs.push(`skill must be one of: ${SKILL_VALUES.join(", ")}`);
    if (!item.card_type) errs.push("card_type is required");
    else if (!CARD_TYPES.includes(item.card_type)) errs.push(`card_type must be one of: ${CARD_TYPES.join(", ")}`);

    // Type-specific checks
    if (item.card_type === "flashcard" && (!item.front || !item.back)) {
      errs.push("flashcard requires both front and back");
    }
    if ((item.card_type === "mcq" || item.card_type === "true_false") && (!item.options?.length || !item.correct_answer)) {
      errs.push(`${item.card_type} requires options_pipe (e.g. A:text|B:text) and correct_answer`);
    }
    if (item.card_type === "mcq" && item.options?.length && item.correct_answer) {
      const labels = item.options.map(o => o.label);
      if (!labels.includes(item.correct_answer)) errs.push(`correct_answer "${item.correct_answer}" not in option labels (${labels.join(",")})`);
    }
    if (item.card_type === "drag_order" && (!item.items_order?.length || item.items_order.length < 2)) {
      errs.push("drag_order requires items_order_pipe with 2+ items (word|word|word)");
    }
    if (item.card_type === "match_pairs" && (!item.pairs?.length || item.pairs.length < 2)) {
      errs.push("match_pairs requires pairs_pipe with 2+ pairs (left=right|left=right)");
    }
    if (item.card_type === "fill_blank" && !item.correct_answer) {
      errs.push("fill_blank requires correct_answer");
    }
  }

  if (entity === "ReadingPassage") {
    if (!item.passage) errs.push("passage is required");
    else if (item.passage.split(/\s+/).filter(Boolean).length < 20) errs.push("passage looks too short (minimum ~20 words)");
  }

  if (entity === "Poem") {
    if (!item.text) errs.push("text is required");
    else if (!item.text.includes("\n")) errs.push("poem text should contain line breaks (use \\n in CSV)");
  }

  if (entity === "LetterTemplate") {
    if (!item.letter_type) errs.push("letter_type is required");
    else if (!LETTER_TYPES.includes(item.letter_type)) errs.push(`letter_type must be one of: ${LETTER_TYPES.join(", ")}`);
    if (!item.parts?.length || item.parts.length < 3) errs.push("parts_pipe must contain 3+ parts (label:text|label:text)");
    const requiredLabels = ["greeting","body","closing"];
    const labels = (item.parts || []).map(p => p.label.toLowerCase());
    requiredLabels.forEach(req => {
      if (!labels.includes(req)) errs.push(`parts must include a "${req}" section for syllabus alignment`);
    });
  }

  return errs;
}