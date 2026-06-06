export const VALID_QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank', 'matching', 'structured', 'comprehension'];
export const VALID_DIFFICULTIES = ['Easy', 'Standard', 'Advanced'];
export const VALID_GRADES = ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'];

export function validateNote(item) {
  const errors = [];
  if (!item.subject_id) errors.push({ field: 'subject_id', message: 'Subject is required' });
  if (!item.topic_name_input?.trim()) errors.push({ field: 'topic_name', message: 'topic_name is required in CSV' });
  if (!item.overview && !item.key_concepts && !item.summary) {
    errors.push({ field: 'content', message: 'At least one of overview, key_concepts, or summary is required' });
  }
  return errors;
}

export function validateQuestion(item) {
  const errors = [];
  if (!item.question_text?.trim()) errors.push({ field: 'question_text', message: 'Question text is required' });
  if (!item.subject_id) errors.push({ field: 'subject_id', message: 'Subject is required' });

  const qType = item.question_type;
  if (qType && !VALID_QUESTION_TYPES.includes(qType)) {
    errors.push({ field: 'question_type', message: `Type must be one of: ${VALID_QUESTION_TYPES.join(', ')}` });
  }
  if (qType === 'mcq' || qType === 'comprehension') {
    if (!item.options || item.options.length < 2) {
      errors.push({ field: 'options', message: 'MCQ needs at least 2 options' });
    }
    if (!item.correct_answer?.trim()) {
      errors.push({ field: 'correct_answer', message: 'Correct answer is required' });
    } else {
      const validLabels = (item.options || []).map(o => o.label);
      if (validLabels.length && !validLabels.includes(item.correct_answer.trim().toUpperCase())) {
        errors.push({ field: 'correct_answer', message: `Must match an option label: ${validLabels.join(', ')}` });
      }
    }
  }
  if (item.difficulty && !VALID_DIFFICULTIES.includes(item.difficulty)) {
    errors.push({ field: 'difficulty', message: 'Must be: Easy, Standard, or Advanced' });
  }
  return errors;
}