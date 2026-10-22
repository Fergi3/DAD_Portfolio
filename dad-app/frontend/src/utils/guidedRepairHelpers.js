import { RUNNING_TOILET_KEY, SINK_P_TRAP_LEAK_KEY } from '../data/diagnosisLibrary';
import leakySinkRepairSteps from '../data/plumbing/leakySinkRepair.json';
import runningToiletRepairSteps from '../data/toilet/runningToiletRepair.json';

export const SINK_LEAK_LOCATION_OPTIONS = [
  'Slip-Joint Connection',
  'Drain Flange',
  'Faucet Base',
  'Water Supply Line',
];

export const OUTCOME_DECISION_STEP = {
  type: 'outcomeDecision',
  title: 'Did this fix the problem?',
};

export const SINK_LEAK_DETAIL_STEPS = {
  'Slip-Joint Connection': [
    {
      title: 'Inspect the Slip-Joint Washer',
      instruction: 'Loosen the leaking slip-joint nut and check whether the washer is cracked, flattened, or out of position.',
      checklist: [
        'Keep the bucket or towels under the P-trap.',
        'Loosen the leaking slip-joint nut carefully.',
        'Inspect the washer and seating surface.',
      ],
    },
    {
      title: 'Replace or Reseat the Washer',
      instruction: 'Reseat the washer or replace it with a matching slip-joint washer, then reassemble the joint by hand.',
      checklist: [
        'Install the washer with the tapered side facing the joint.',
        'Thread the nut back on by hand.',
        'Snug it gently with adjustable pliers only if needed.',
      ],
    },
    {
      title: 'Retest the Connection',
      instruction: 'Run water again and watch the repaired slip-joint connection for new drips.',
      checklist: [
        'Run water for at least 30 seconds.',
        'Check the repaired joint with a dry towel.',
        'Stop if the fitting cracks or will not seal.',
      ],
    },
  ],
  'Drain Flange': [
    {
      title: 'Check the Drain Flange',
      instruction: 'Look at the sink drain flange from above and below to see whether water is escaping around the drain opening.',
      checklist: [
        'Run a small amount of water around the drain opening.',
        'Watch below the sink for water at the drain flange.',
        'Call a plumber if the flange or sink body is damaged.',
      ],
    },
  ],
  'Faucet Base': [
    {
      title: 'Check the Faucet Base',
      instruction: 'Dry the faucet base and run water to see whether water is leaking from the fixture instead of the drain.',
      checklist: [
        'Dry around the faucet base.',
        'Run the faucet while keeping the drain area dry.',
        'Check supply lines and faucet mounting points underneath.',
      ],
    },
  ],
  'Water Supply Line': [
    {
      title: 'Inspect Water Supply Lines',
      instruction: 'Check the flexible supply lines connecting the faucet to the shut-off valves for leaks or damage.',
      checklist: [
        'Dry the supply lines completely.',
        'Run water and watch for drips from the supply line connections.',
        'Tighten any loose connections or replace damaged lines.',
      ],
    },
  ],
};

export const GENERIC_REPAIR_FOLLOW_UP_OPTIONS = [
  'It still happens the same way',
  'It improved but is not fixed',
  'A different symptom appeared',
  'Not sure',
];

const DEFAULT_COMMON_MISTAKES = [
  'Skipping the shutoff or safety check.',
  'Forcing a part that should move gently.',
  'Changing several things at once before testing.',
];

export function getAllGuideSteps({ diagnosis, isSinkTrapFlow, isRunningToiletFlow }) {
  if (isSinkTrapFlow) return leakySinkRepairSteps;
  if (isRunningToiletFlow) return runningToiletRepairSteps;
  return diagnosis?.troubleshootingSteps || diagnosis?.steps || [];
}

export function getOptionalGuideSteps(allGuideSteps) {
  return allGuideSteps.filter((step) => step?.optional);
}

export function getRequiredGuideSteps(allGuideSteps) {
  return allGuideSteps.filter((step) => !step?.optional);
}

export function getInitialSinkLeakDetailSteps({ diagnosis, isSinkTrapFlow, requiredGuideSteps }) {
  if (!isSinkTrapFlow) return [];

  const savedSteps = diagnosis?.repairSteps || diagnosis?.steps || diagnosis?.troubleshootingSteps || [];
  if (!Array.isArray(savedSteps) || savedSteps.length <= requiredGuideSteps.length) return [];

  return savedSteps.slice(requiredGuideSteps.length);
}

export function getDisplayedSteps({ isSinkTrapFlow, requiredGuideSteps, sinkLeakDetailSteps }) {
  return isSinkTrapFlow
    ? [...requiredGuideSteps, ...sinkLeakDetailSteps, OUTCOME_DECISION_STEP]
    : requiredGuideSteps;
}

export function getRepairStepsForDiagnosis({
  isSinkTrapFlow,
  requiredGuideSteps,
  sinkLeakDetailSteps,
  displayedSteps,
}) {
  return isSinkTrapFlow ? [...requiredGuideSteps, ...sinkLeakDetailSteps] : displayedSteps;
}

export function getInitialStepIndex(resumeStepIndex, displayedSteps) {
  return Math.max(0, Math.min(resumeStepIndex, Math.max(displayedSteps.length - 1, 0)));
}

export function getRepairStepCount({ isSinkTrapFlow, requiredGuideSteps, sinkLeakDetailSteps, totalSteps }) {
  return isSinkTrapFlow ? requiredGuideSteps.length + sinkLeakDetailSteps.length : totalSteps;
}

export function getSimpleFixStepCount(diagnosis, repairStepCount) {
  return Math.max(1, Math.min(Number(diagnosis?.simpleFixStepCount) || 4, repairStepCount));
}

export function getHasAdvancedSteps({ currentStepIndex, totalSteps, isSinkTrapFlow, sinkLeakDetailSteps }) {
  return currentStepIndex < totalSteps - 1 || (isSinkTrapFlow && sinkLeakDetailSteps.length === 0);
}

export function canUsePrimaryStepAction({
  finalDecision,
  isOutcomeDecisionStep,
  shouldShowSimpleFixCheckpoint,
  isSinkTrapFlow,
}) {
  return (
    finalDecision === 'yes' ||
    (!isOutcomeDecisionStep && !(shouldShowSimpleFixCheckpoint && !isSinkTrapFlow))
  );
}

export function getSimpleFixFollowUpQuestion(diagnosis, isSinkTrapFlow) {
  if (isSinkTrapFlow) return 'Where is the leak coming from?';
  return diagnosis?.followUpQuestion || 'What are you still noticing?';
}

export function isSinkPTrapDiagnosis(diagnosis, label, categoryTitle) {
  if (diagnosis?.diagnosisKey === SINK_P_TRAP_LEAK_KEY) return true;

  const text = [
    diagnosis?.issue,
    diagnosis?.likelyIssue,
    diagnosis?.recommendedNextCheck,
    label,
    categoryTitle,
  ].join(' ').toLowerCase();

  return /sink|p-trap|ptrap|p trap|slip-joint|drain/.test(text) && /leak|leaking|drip|washer|seal/.test(text);
}

export function isRunningToiletDiagnosis(diagnosis, label, categoryTitle) {
  if (diagnosis?.diagnosisKey === RUNNING_TOILET_KEY) return true;

  const text = [
    diagnosis?.issue,
    diagnosis?.likelyIssue,
    diagnosis?.recommendedNextCheck,
    label,
    categoryTitle,
  ].join(' ').toLowerCase();

  return /toilet|tank|flapper|fill valve|overflow tube|flush/.test(text) && /running|runs|refill|refilling|hissing|trickling|flapper|overflow/.test(text);
}

export function normalizeToolName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getToolName(tool) {
  if (typeof tool === 'string') return tool;
  return tool?.name || tool?.tool || tool?.title || '';
}

export function getStepTool(tools, stepIndex) {
  if (!Array.isArray(tools) || tools.length === 0) return '';
  return tools[stepIndex % tools.length];
}

export function buildRepairStep(step, stepIndex, diagnosis) {
  if (step && typeof step === 'object') {
    const checklist = Array.isArray(step.checklist) ? step.checklist : getStepParts(step.text || step.title || '');
    return {
      title: step.title || `Repair Step ${stepIndex + 1}`,
      instruction: ensureCompleteSentence(step.description || step.instruction || step.summary || 'Work through this checklist before moving on.'),
      checklist: normalizeChecklist(checklist),
      moreDetail: ensureCompleteSentence(step.moreDetail || step.detail || 'Move slowly, keep the area clear, and check your work before continuing.'),
      commonMistakes: step.commonMistakes || DEFAULT_COMMON_MISTAKES,
      safetyReminder: step.safetyReminder || getDefaultSafetyReminder(diagnosis),
      image: step.image || null,
      tip: step.tip || '',
      optional: Boolean(step.optional),
    };
  }

  const parts = getStepParts(step);
  return {
    title: getStepTitle(parts[0], stepIndex),
    instruction: getStepInstruction(parts[0]),
    checklist: normalizeChecklist(parts),
    moreDetail: ensureCompleteSentence(parts.length > 1
      ? parts.join(' ')
      : 'Take your time with this step. The goal is to make one clear change, then reassess before moving on.'),
    commonMistakes: DEFAULT_COMMON_MISTAKES,
    safetyReminder: getDefaultSafetyReminder(diagnosis),
  };
}

function getStepTitle(text, stepIndex) {
  if (!text) return `Repair Step ${stepIndex + 1}`;
  const cleaned = text.replace(/[.!?]\s*$/, '');
  return ensureCompleteSentence(cleaned) || `Repair Step ${stepIndex + 1}`;
}

function getStepInstruction(text) {
  if (!text) return 'Work through this checklist before moving on.';
  return ensureCompleteSentence(text);
}

function ensureCompleteSentence(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return /[.!?)]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function normalizeChecklist(parts) {
  const cleanParts = parts
    .map((part) => ensureCompleteSentence(part))
    .filter(Boolean);

  if (cleanParts.length >= 2) return cleanParts.slice(0, 4);
  if (cleanParts.length === 1) {
    return [
      cleanParts[0],
      'Check the area from a second angle',
      'Confirm nothing is loose, hot, wet, or unsafe',
    ];
  }

  return ['Look over the area', 'Make the smallest safe adjustment', 'Confirm the issue changed'];
}

function getDefaultSafetyReminder(diagnosis) {
  if (Array.isArray(diagnosis?.safetyWarnings) && diagnosis.safetyWarnings[0]) {
    return diagnosis.safetyWarnings[0];
  }
  if (diagnosis?.safetyWarning) return diagnosis.safetyWarning;
  return 'Pause if you see water, smell burning, feel heat, or feel unsure.';
}

function getStepParts(stepText) {
  if (!stepText || typeof stepText !== 'string') return [];

  const numberedParts = stepText
    .split(/\s(?=\d+\.\s)/)
    .map((part) => part.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  if (numberedParts.length > 1) return numberedParts;

  const semicolonParts = stepText
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  if (semicolonParts.length > 1) return semicolonParts;

  const sentenceParts = stepText
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);

  return sentenceParts.length > 1 ? sentenceParts : [stepText.trim()];
}
