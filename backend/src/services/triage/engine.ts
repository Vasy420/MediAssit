import {
  Category,
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_SPECIALTY_SCORES,
  detectCategories,
  QUESTIONS,
  TriageQuestion,
} from './lexicon.js';
import { SPECIALTY_BY_CODE } from '../../constants/specialties.js';
import {
  AnswerInput,
  ChatTurn,
  PatientContext,
  TriageChatInput,
  TriageQuestionOut,
  TriageResult,
  UrgencyLevel,
} from './engineTypes.js';

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  green: 'Routine',
  yellow: 'Soon',
  orange: 'Urgent',
  red: 'Emergency',
};

const DISCLAIMER =
  'This is AI-assisted guidance, not a medical diagnosis. Always consult a qualified healthcare professional.';

/* ------------------------- helpers ------------------------- */

function patientTexts(messages: { role: string; text: string }[]): string[] {
  return messages.filter((m) => m.role === 'patient').map((m) => m.text);
}

function wordList(texts: string[]): string {
  return ' ' + texts.join(' ').toLowerCase() + ' ';
}

function hasWord(haystack: string, word: string): boolean {
  return haystack.includes(' ' + word) || haystack.includes(' ' + word + '.') || haystack.includes(' ' + word + ',');
}

function answerValue(answers: AnswerInput[], key: string): string | undefined {
  const a = answers.find((x) => x.key === key);
  return a && a.answer !== 'not_sure' ? a.answer : undefined;
}

function answerSev(answers: AnswerInput[]): string | undefined {
  return (
    answerValue(answers, 'Q_fever_severity') ??
    answerValue(answers, 'Q_stomach_sev') ??
    answerValue(answers, 'Q_chest_sev') ??
    answerValue(answers, 'Q_breath_sev') ??
    answerValue(answers, 'Q_head_sev') ??
    answerValue(answers, 'Q_bone_sev') ??
    answerValue(answers, 'Q_skin_sev') ??
    answerValue(answers, 'Q_ent_sev') ??
    answerValue(answers, 'Q_women_sev') ??
    answerValue(answers, 'Q_child_sev')
  );
}

function answerOnset(answers: AnswerInput[]): { label: string; days?: number } {
  const v =
    answerValue(answers, 'Q_fever_onset') ??
    answerValue(answers, 'Q_stomach_onset') ??
    answerValue(answers, 'Q_chest_onset') ??
    answerValue(answers, 'Q_head_onset') ??
    answerValue(answers, 'Q_bone_onset') ??
    answerValue(answers, 'Q_skin_onset') ??
    answerValue(answers, 'Q_ent_onset') ??
    answerValue(answers, 'Q_women_onset') ??
    answerValue(answers, 'Q_child_onset');
  if (v === 'today') return { label: 'Started today', days: 0 };
  if (v === 'days_2_3') return { label: 'Started 2-3 days ago', days: 2 };
  if (v === 'week_more') return { label: 'Been there for more than a week', days: 8 };
  return { label: 'Duration not clear yet' };
}

function collectAssoc(answers: AnswerInput[]): Set<string> {
  const keys = [
    'Q_fever_assoc',
    'Q_chest_assoc',
    'Q_head_assoc',
    'Q_breath_when',
    'Q_breath_fever',
    'Q_bone_cause',
    'Q_skin_type',
    'Q_child_fever',
  ];
  const out = new Set<string>();
  for (const k of keys) {
    const v = answerValue(answers, k);
    if (v) out.add(v);
  }
  return out;
}

/* ------------------------- symptom extraction ------------------------- */

const SYMPTOM_PHRASES: { cat: string; phrase: string }[] = [
  { cat: 'bone', phrase: 'knee pain' },
  { cat: 'bone', phrase: 'back pain' },
  { cat: 'bone', phrase: 'joint pain' },
  { cat: 'bone', phrase: 'leg pain' },
  { cat: 'bone', phrase: 'fracture' },
  { cat: 'chest', phrase: 'chest pain' },
  { cat: 'chest', phrase: 'palpitations' },
  { cat: 'head', phrase: 'headache' },
  { cat: 'head', phrase: 'dizziness' },
  { cat: 'head', phrase: 'blurred vision' },
  { cat: 'head', phrase: 'numbness' },
  { cat: 'head', phrase: 'weakness' },
  { cat: 'breathing', phrase: 'cough' },
  { cat: 'breathing', phrase: 'difficulty breathing' },
  { cat: 'breathing', phrase: 'wheezing' },
  { cat: 'stomach', phrase: 'stomach pain' },
  { cat: 'stomach', phrase: 'nausea' },
  { cat: 'stomach', phrase: 'vomiting' },
  { cat: 'stomach', phrase: 'diarrhoea' },
  { cat: 'fever', phrase: 'fever' },
  { cat: 'skin', phrase: 'rash' },
  { cat: 'skin', phrase: 'itching' },
  { cat: 'ent', phrase: 'sore throat' },
  { cat: 'ent', phrase: 'ear pain' },
  { cat: 'ent', phrase: 'hearing' },
];

function extractSymptoms(texts: string[]): { name: string; category: string }[] {
  const t = wordList(texts);
  const out: { name: string; category: string }[] = [];
  for (const row of SYMPTOM_PHRASES) {
    if (t.includes(' ' + row.phrase)) {
      out.push({ name: row.phrase, category: row.cat });
    }
  }
  return out;
}import { computeWarnSigns, computeSpecialties } from './engineHelpers.js';

/* ------------------------- public result helpers ------------------------- */

const SEVERITIES: Record<string, string> = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };

function toOut(q: TriageQuestion, rephrased: boolean): TriageQuestionOut {
  return {
    id: q.id,
    key: q.id,
    text: rephrased ? q.simplePrompt : q.prompt,
    rephrased,
    options: q.options.map((o) => ({
      id: o.id,
      key: q.id + '.' + o.id,
      text: o.text,
      emoji: o.emoji,
    })),
  };
}

export function buildCategoryQuestion(): TriageQuestionOut {
  const options: TriageQuestionOut['options'] = CATEGORIES.map((c) => ({
    id: c,
    key: 'category.' + c,
    text: CATEGORY_LABEL[c],
    emoji: CATEGORY_EMOJI[c],
  }));
  options.push({ id: 'not_sure', key: 'category.not_sure', text: 'I am not sure', emoji: 'question' });
  return {
    id: 'category',
    key: 'category',
    text: 'What problem are you having?',
    rephrased: false,
    options,
  };
}

function buildFallbackGeneral(): TriageResult {
  return {
    symptoms: [],
    duration: { label: 'Duration not clear yet' },
    severity: { level: 'mild', label: 'Mild' },
    urgency: { level: 'green', label: 'Routine' },
    recommended_specialties: [
      {
        code: 'D001',
        specialty: 'General Physician',
        department: 'General Medicine',
        relevance: 1,
      },
    ],
    emergency_flag: false,
    warning_signs: [],
    reason:
      'Since we could not identify a specific problem, we recommend starting with a general physician who can guide you further.',
    disclaimer: DISCLAIMER,
  };
}

function buildResult(
  cats: Category[],
  answers: AnswerInput[],
  texts: string[],
  patient: PatientContext | null | undefined,
): TriageResult {
  const assoc = collectAssoc(answers);
  const sevRaw = answerSev(answers);
  const onset = answerOnset(answers);
  const warnSigns = computeWarnSigns(cats, assoc, texts, sevRaw);

  const map: Record<string, 'mild' | 'moderate' | 'severe'> = {
    little: 'mild',
    medium: 'moderate',
    severe: 'severe',
  };
  const sevLevel = sevRaw && map[sevRaw] ? map[sevRaw] : 'moderate';

  let urgency: UrgencyLevel = 'green';
  if (warnSigns.length > 0) urgency = 'red';
  else if (sevLevel === 'severe') urgency = 'orange';
  else if (sevLevel === 'moderate') urgency = 'yellow';
  else if (onset.days !== undefined && onset.days >= 8) urgency = 'yellow';

  let reason = 'Your symptoms can usually be handled with a routine appointment.';
  if (urgency === 'red') {
    reason =
      'Your symptoms may require immediate medical attention. Please seek emergency medical care now.';
  } else if (urgency === 'orange') {
    reason = 'Your symptoms should be evaluated by a healthcare professional promptly.';
  } else if (urgency === 'yellow') {
    reason =
      'You should seek medical evaluation relatively soon. Consider booking an appointment within the next day or two.';
  }

  return {
    symptoms: extractSymptoms(texts),
    duration: onset,
    severity: { level: sevLevel, label: SEVERITIES[sevLevel] },
    urgency: { level: urgency, label: URGENCY_LABEL[urgency] },
    recommended_specialties: computeSpecialties(cats, patient),
    emergency_flag: urgency === 'red',
    warning_signs: warnSigns,
    reason,
    disclaimer: DISCLAIMER,
  };
}/**
 * Main adaptive conversation driver.
 * Returns either the next single question, or the final triage result
 * when enough information has been collected.
 */
export function nextChatTurn(input: TriageChatInput): ChatTurn {
  const texts = patientTexts(input.messages);
  const answers = input.answers ?? [];
  let cats = detectCategories(texts);

  if (cats.length === 0 && answers.length === 0) {
    return { type: 'question', question: buildCategoryQuestion(), done: false };
  }

  const catAnswer = answers.find((a) => a.key === 'category');
  if (catAnswer && catAnswer.answer !== 'not_sure') {
    const chosen = catAnswer.answer as Category;
    if (!cats.includes(chosen)) cats = [chosen, ...cats];
  }
  if (cats.length === 0 && catAnswer && catAnswer.answer === 'not_sure') {
    return { type: 'result', triage: buildFallbackGeneral() };
  }

  const assoc = collectAssoc(answers);
  const sevRaw = answerSev(answers);
  const warnSigns = computeWarnSigns(cats, assoc, texts, sevRaw);
  const highRisk = cats.filter((c) => c === 'chest' || c === 'head' || c === 'breathing');
  if (warnSigns.length > 0 && highRisk.length > 0) {
    return { type: 'result', triage: buildResult(cats, answers, texts, input.patient) };
  }

  let index = 0;
  let found: ChatTurn | null = null;
  while (found === null) {
    let progressed = false;
    for (const cat of cats) {
      const list = QUESTIONS[cat];
      if (index < list.length) {
        progressed = true;
        const q = list[index];
        const prev = answers.find((a) => a.key === q.id);
        if (prev && prev.answer === 'not_sure' && !prev.rephrased) {
          found = { type: 'question', question: toOut(q, true), done: false };
          break;
        }
        if (!prev) {
          found = { type: 'question', question: toOut(q, false), done: false };
          break;
        }
      }
    }
    if (found) break;
    if (!progressed) break;
    index += 1;
  }

  if (found) return found;
  return { type: 'result', triage: buildResult(cats, answers, texts, input.patient) };
}

export { URGENCY_LABEL };