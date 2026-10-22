import leakySinkRepairSteps from './plumbing/leakySinkRepair.json';
import runningToiletRepairSteps from './toilet/runningToiletRepair.json';

export const SINK_P_TRAP_LEAK_KEY = 'sink_p_trap_leak';
export const RUNNING_TOILET_KEY = 'running_toilet';

export const SINK_P_TRAP_LEAK_TOOLS = [
  'Bucket',
  'Towel or rag',
  'Adjustable wrench or channel-lock pliers',
  'Replacement slip-joint washer (if needed)',
  'Flashlight (optional)',
  'Gloves (optional)',
];

export const RUNNING_TOILET_TOOLS = [
  'Universal replacement flapper',
  'Replacement fill valve (optional)',
  'Adjustable wrench',
  'Sponge or towel',
];

export const RUNNING_TOILET_PREPARATION_ITEMS = [
  { name: 'Sponge or towel', category: 'supply', required: true },
  { name: 'Adjustable wrench', category: 'tool', required: false },
  { name: 'Universal replacement flapper', category: 'part', required: false },
  { name: 'Replacement fill valve', category: 'part', required: false },
];

export const SINK_P_TRAP_LEAK_QUESTIONS = [
  {
    id: 'sink_water_location',
    text: 'Where do you see the water?',
    options: ['Under the sink', 'Around the faucet', 'From the drain', 'Not sure'],
  },
  {
    id: 'sink_running_only',
    text: 'Does it leak only when the water is running?',
    options: ['Yes', 'No', 'Not sure'],
  },
  {
    id: 'sink_p_trap_drip',
    text: 'Is water dripping from the curved pipe under the sink?',
    options: ['Yes', 'No', 'Not sure'],
  },
  {
    id: 'sink_loose_connections',
    text: 'Do any pipe connections feel loose?',
    options: ['Yes', 'No', "I haven't checked"],
  },
  {
    id: 'sink_damage_warning',
    text: 'Is there corrosion, cracking, or a strong smell?',
    options: ['Yes', 'No', 'Not sure'],
  },
];

export const RUNNING_TOILET_QUESTIONS = [
  {
    id: 'toilet_running_sound',
    text: 'What does the running sound like?',
    options: ['Water trickling into bowl constantly', 'Gurgling or intermittent refilling', 'A hissing sound from the tank'],
  },
  {
    id: 'toilet_flush_normal',
    text: 'Does the toilet flush normally?',
    options: ['Yes, flushes fine but keeps running', 'Weak flush', "Doesn't flush at all"],
  },
  {
    id: 'toilet_duration',
    text: 'How long has this been happening?',
    options: ['Just started today', 'A few days', 'Weeks or longer'],
  },
];

export const SINK_P_TRAP_LEAK_DIAGNOSIS = {
  diagnosisKey: SINK_P_TRAP_LEAK_KEY,
  issue: 'Loose P-trap connection or worn slip-joint washer',
  likelyIssue: 'Loose P-trap connection or worn slip-joint washer',
  confidence: 'Medium',
  difficulty: 'Easy to Moderate',
  estimatedTime: '15-30 minutes',
  tools: SINK_P_TRAP_LEAK_TOOLS,
  toolsNeeded: SINK_P_TRAP_LEAK_TOOLS,
  safetyWarnings: [
    'Place a bucket under the P-trap before loosening any drain connection.',
    'Stop if you see corrosion, cracking, sewage smell, or water coming from inside the wall.',
  ],
  safetyWarning: 'Place a bucket under the P-trap before loosening any drain connection.',
  beforeYouStart: [
    'Place a bucket under the P-trap before loosening any drain connection.',
    'Stop if you see corrosion, cracking, sewage smell, or water coming from inside the wall.',
  ],
  steps: leakySinkRepairSteps,
  troubleshootingSteps: leakySinkRepairSteps,
  repairSteps: leakySinkRepairSteps,
  whyThisMightBeHappening:
    'Water under the sink often comes from a loose P-trap slip nut or a worn slip-joint washer when the sink drains.',
  recommendedNextCheck:
    'Dry the trap, run water briefly, and watch the curved P-trap and slip-joint connections for the first drip.',
  followUpQuestion: 'Does it leak only when water drains, or even when the faucet is off?',
  callAPro:
    'Call a plumber if water comes from inside the wall, a shutoff valve will not close, or cabinet flooring is swollen or moldy.',
  stopAndCallAProIf: [
    'Water is coming from inside the wall.',
    'A shutoff valve will not close.',
    'Cabinet flooring is swollen or moldy.',
  ],
  diySuitability: 'diy friendly',
  aiUsed: false,
};

export const RUNNING_TOILET_DIAGNOSIS = {
  diagnosisKey: RUNNING_TOILET_KEY,
  issue: 'Worn flapper valve or faulty fill valve',
  likelyIssue: 'Worn flapper valve or faulty fill valve',
  confidence: 'High',
  difficulty: 'Easy',
  estimatedTime: '20-40 minutes',
  tools: RUNNING_TOILET_TOOLS,
  toolsNeeded: RUNNING_TOILET_TOOLS,
  preparationItems: RUNNING_TOILET_PREPARATION_ITEMS,
  safetyWarnings: [
    'No electrical hazard. Turn off the toilet shut-off valve before making repairs inside the tank.',
    'Set the tank lid on a flat surface so it does not crack or slide.',
  ],
  safetyWarning: 'Turn off the toilet shut-off valve before making repairs inside the tank.',
  beforeYouStart: [
    'Set the tank lid on a flat surface.',
    'Know where the toilet shut-off valve is before adjusting parts inside the tank.',
  ],
  steps: runningToiletRepairSteps,
  troubleshootingSteps: runningToiletRepairSteps,
  repairSteps: runningToiletRepairSteps,
  whyThisMightBeHappening:
    'A running toilet is often caused by a flapper that does not seal, a chain with the wrong slack, or water rising into the overflow tube.',
  recommendedNextCheck:
    'Remove the tank lid, flush once, and watch whether the flapper closes fully and the water level stops below the overflow tube.',
  followUpQuestion: 'Is the toilet still running after checking the flapper, chain, and overflow tube?',
  callAPro:
    'Call a plumber if the toilet still runs after replacing worn tank parts, the shut-off valve will not close, or you see cracks in the tank.',
  stopAndCallAProIf: [
    'The shut-off valve will not close.',
    'The tank or bowl is cracked.',
    'Water is leaking onto the floor.',
  ],
  diySuitability: 'diy friendly',
  aiUsed: false,
};

const DIAGNOSIS_LIBRARY = {
  [SINK_P_TRAP_LEAK_KEY]: SINK_P_TRAP_LEAK_DIAGNOSIS,
  [RUNNING_TOILET_KEY]: RUNNING_TOILET_DIAGNOSIS,
};

const DIAGNOSIS_QUESTION_LIBRARY = {
  [SINK_P_TRAP_LEAK_KEY]: SINK_P_TRAP_LEAK_QUESTIONS,
  [RUNNING_TOILET_KEY]: RUNNING_TOILET_QUESTIONS,
};

function cloneDiagnosis(diagnosis) {
  return {
    ...diagnosis,
    tools: [...(diagnosis.tools || [])],
    toolsNeeded: [...(diagnosis.toolsNeeded || diagnosis.tools || [])],
    preparationItems: (diagnosis.preparationItems || []).map((item) => ({ ...item })),
    safetyWarnings: [...(diagnosis.safetyWarnings || [])],
    beforeYouStart: [...(diagnosis.beforeYouStart || [])],
    steps: (diagnosis.steps || []).map(cloneStep),
    troubleshootingSteps: (diagnosis.troubleshootingSteps || diagnosis.steps || []).map(cloneStep),
    repairSteps: (diagnosis.repairSteps || diagnosis.steps || []).map(cloneStep),
    stopAndCallAProIf: [...(diagnosis.stopAndCallAProIf || [])],
  };
}

function cloneStep(step) {
  if (!step || typeof step !== 'object') return step;
  return {
    ...step,
    checklist: [...(step.checklist || [])],
    commonMistakes: [...(step.commonMistakes || [])],
  };
}

export function getDiagnosisByKey(diagnosisKey) {
  const diagnosis = DIAGNOSIS_LIBRARY[diagnosisKey];
  return diagnosis ? cloneDiagnosis(diagnosis) : null;
}

export function getQuestionsByDiagnosisKey(diagnosisKey) {
  return DIAGNOSIS_QUESTION_LIBRARY[diagnosisKey] || null;
}

export function getDiagnosisKeyFromText(value) {
  const text = String(value || '').toLowerCase();
  const hasSinkTerm = /sink|faucet|drain|pipe|p-trap|ptrap|p trap|under sink|under the sink/.test(text);
  const hasLeakTerm = /leak|leaking|leaky|drip|dripping|water|wet|puddle/.test(text);
  const hasToiletTerm = /toilet|tank|flapper|flush|overflow tube|fill valve/.test(text);
  const hasRunningToiletTerm = /running|runs|run|refill|refilling|hissing|trickling|flapper|overflow|fill valve/.test(text);

  if (hasToiletTerm && hasRunningToiletTerm) return RUNNING_TOILET_KEY;
  return hasSinkTerm && hasLeakTerm ? SINK_P_TRAP_LEAK_KEY : null;
}
