// diagnoseService.js
// Core business logic for questions and diagnosis.
// This is the only file that talks to the data layer and the AI service.
// Controllers call these functions - they never touch req/res.

const staticQuestions = require('../data/questions');
const staticDiagnoses = require('../data/diagnoses');
const openaiService = require('./openaiService');
const { buildClarificationPrompt, buildDiagnosisPrompt } = require('../utils/promptFormatter');

const inFlightDiagnoses = new Map();
const SINK_P_TRAP_TOOLS = [
  'Bucket',
  'Towel or rag',
  'Adjustable wrench or channel-lock pliers',
  'Replacement slip-joint washer (if needed)',
  'Flashlight (optional)',
  'Gloves (optional)',
];

function sanitizeErrorMessage(message) {
  if (typeof message !== 'string') {
    return 'OpenAI request failed.';
  }

  return message.replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]');
}

function normalizeProblemType(problemType) {
  return String(problemType || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
}

function normalizeAnswers(answers) {
  if (Array.isArray(answers)) {
    return answers.reduce((result, answer, index) => {
      if (typeof answer === 'string' && answer.trim()) {
        result[`answer_${index + 1}`] = answer.trim();
      }
      return result;
    }, {});
  }

  if (!answers || typeof answers !== 'object') {
    return {};
  }

  return Object.entries(answers).reduce((result, [key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      result[key] = value.trim();
    }
    return result;
  }, {});
}

function normalizeConfidence(value) {
  const normalizedValue = String(value || '').toLowerCase();
  if (normalizedValue === 'low') return 'Low';
  if (normalizedValue === 'high') return 'High';
  return 'Medium';
}

function normalizeDifficulty(value) {
  const normalizedValue = String(value || '').toLowerCase();
  if (normalizedValue.includes('pro')) return 'Pro Recommended';
  if (normalizedValue.includes('hard')) return 'Hard';
  if (normalizedValue.includes('easy')) return 'Easy';
  return 'Moderate';
}

function inferDiySuitability(difficulty) {
  if (difficulty === 'Easy') return 'Beginner-friendly';
  if (difficulty === 'Hard' || difficulty === 'Pro Recommended') {
    return 'Professional recommended';
  }
  return 'Use caution';
}

function getAnswersText(answers) {
  return Object.values(answers || {})
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

function buildLegacyPossibleCauses(diagnosis) {
  const cause = diagnosis.issue || diagnosis.likelyIssue || 'Likely household repair issue';
  const whyItFits =
    diagnosis.whyThisMightBeHappening ||
    diagnosis.why ||
    'This matches the symptoms provided, but more location-specific checking is needed.';

  return [
    {
      cause,
      likelihood: normalizeConfidence(diagnosis.confidence),
      whyItFits,
      whyItMightNotFit:
        'The exact cause may change after inspecting the source and location closely.',
    },
  ];
}

function buildLegacyLessLikelyCauses(possibleCauses) {
  return [
    {
      cause: 'A generic common failure unrelated to the described location',
      reason: `Less likely than ${
        possibleCauses[0]?.cause || 'the main cause'
      } because location-specific clues should be checked first.`,
    },
  ];
}

function isSinkLeakDiagnosis(problemType, diagnosis) {
  const text = [
    problemType,
    diagnosis?.issue,
    diagnosis?.likelyIssue,
    diagnosis?.yourDiagnosis,
    diagnosis?.recommendedNextCheck,
    diagnosis?.followUpQuestion,
  ].join(' ').toLowerCase();

  return /leaky-sink|sink|faucet|drain|pipe|p-trap|ptrap|p trap/.test(text) && /leak|leaking|drip|water|wet|puddle|washer|seal|slip-joint/.test(text);
}

function buildGenericCustomDiagnosis(problemType, answers) {
  const description = answers.customProblemDescription || 'the custom problem described';
  const category = answers.category || problemType;
  const mentionsLeak = /leak|drip|water|wet|puddle/.test(getAnswersText(answers));

  return {
    likelyIssue: mentionsLeak
      ? `Possible leak related to: "${description}"`
      : `Needs more detail to diagnose: "${description}"`,
    confidence: 'Low',
    possibleCauses: [
      {
        cause: mentionsLeak
          ? 'Loose connection, worn seal, or nearby water source'
          : 'A component in the described area may be loose, worn, blocked, or failing',
        likelihood: 'Medium',
        whyItFits: `The custom description says "${description}", but it does not include enough exact location detail to identify one specific part yet.`,
        whyItMightNotFit:
          'The top cause may change once the exact item, location, timing, and severity are confirmed.',
      },
    ],
    lessLikelyCauses: [
      {
        cause: 'A generic common failure for the selected category',
        reason:
          'Less likely until the exact location is confirmed. D.A.D. should not guess a common part without matching it to where the symptom appears.',
      },
    ],
    recommendedNextCheck:
      `For "${description}", first identify the exact item and location. Dry or clear the area, recreate the symptom once if safe, and watch where it starts.`,
    safetyWarnings: [
      'Stop if you see sparks, smoke, burning smells, gas smells, active flooding, or structural damage.',
      'Turn off water, power, or the appliance before touching connections if there is any leak or electrical risk.',
    ],
    toolsNeeded: ['Flashlight', 'Towels', 'Phone camera for photos', 'Basic hand tools if safe'],
    repairSteps: [
      `Write down the exact item involved in the ${category} area.`,
      'Look for the first visible source of the symptom, not just where it ends up.',
      'Check whether it happens all the time, only when used, or only after a specific action.',
      'Take a photo of the source area or model label if available.',
      'Use the next check result to narrow the cause before replacing parts.',
    ],
    stopAndCallAProIf: [
      'The source is inside a wall, ceiling, floor, electrical panel, gas line, or sealed appliance cabinet.',
      'The problem gets worse while checking it.',
      'You cannot safely shut off the water, power, or appliance.',
    ],
    difficulty: 'Moderate',
    estimatedTime: '10-30 minutes to inspect',
    followUpQuestion:
      'What exact item is having the problem, and where do you first see or hear it happening?',
  };
}

function buildDryerBurningSmellDiagnosis() {
  return {
    likelyIssue:
      'Dryer burning smell, possibly from lint buildup, overheating, or an electrical component issue',
    confidence: 'Medium',
    possibleCauses: [
      {
        cause: 'Lint buildup in the lint screen, vent hose, or exterior vent',
        likelihood: 'High',
        whyItFits:
          'A burning smell from a dryer is often caused by lint overheating inside the airflow path.',
        whyItMightNotFit:
          'If the smell is sharp like melting plastic or electrical insulation, an internal electrical part may be more likely.',
      },
      {
        cause: 'Overheating from restricted airflow',
        likelihood: 'High',
        whyItFits:
          'Blocked airflow makes the dryer run hotter than normal and can create a burning odor.',
        whyItMightNotFit:
          'If the vent is fully clear and the smell starts immediately, the source may be inside the dryer cabinet.',
      },
      {
        cause: 'Electrical component, belt, or motor overheating',
        likelihood: 'Medium',
        whyItFits:
          'Burning plastic, rubber, or electrical smells can come from a worn belt, motor, wiring, or control part.',
        whyItMightNotFit:
          'This cannot be confirmed without inspection, and opening the dryer may not be safe for every user.',
      },
    ],
    lessLikelyCauses: [
      {
        cause: 'Normal warm laundry smell',
        reason:
          'Less likely if the smell is clearly burning, plastic-like, smoky, or stronger than usual.',
      },
    ],
    recommendedNextCheck:
      'Stop the dryer, unplug it, clean the lint screen, check the vent hose and outside vent for lint blockage, and do not run it again if the smell persists.',
    safetyWarnings: [
      'Stop using the dryer immediately if you smell burning, see smoke, or the dryer feels unusually hot.',
      'Unplug an electric dryer before checking vents. For a gas dryer, also shut off gas if you smell gas or rotten eggs and leave the area.',
    ],
    toolsNeeded: ['Flashlight', 'Vacuum with hose attachment', 'Dryer vent brush', 'Screwdriver if removing the vent hose'],
    repairSteps: [
      'Stop the cycle and let the dryer cool.',
      'Clean the lint screen completely.',
      'Unplug the dryer, pull it out carefully, and inspect the flexible vent hose for lint, kinks, or crushing.',
      'Check the outside vent flap and clear lint or debris so it opens freely.',
      'Run the dryer only after airflow is clear. If the burning smell returns, stop and call an appliance repair professional.',
    ],
    stopAndCallAProIf: [
      'You see smoke, sparks, scorch marks, or melted plastic.',
      'The burning smell returns after cleaning the lint path.',
      'The dryer trips the breaker or the cord/outlet feels hot.',
      'You smell gas or rotten eggs near a gas dryer.',
    ],
    difficulty: 'Moderate',
    estimatedTime: '20-60 minutes',
    followUpQuestion:
      'Does the smell seem like burning lint, melting plastic, rubber, electrical odor, or gas?',
  };
}

function buildFreeModeCustomDiagnosis(problemType, answers) {
  const text = getAnswersText(answers);
  const dryerBurningSmell =
    /dryer/.test(text) && /burn|burning|smoke|smoky|plastic|rubber|electrical|hot smell|odor/.test(text);

  const keywordDiagnosis = buildLocationAwareDiagnosis(problemType, answers) ||
    (dryerBurningSmell ? buildDryerBurningSmellDiagnosis() : null);

  return {
    ...(keywordDiagnosis || buildGenericCustomDiagnosis(problemType, answers)),
    mode: 'free',
    aiUsed: false,
  };
}

function buildLocationAwareDiagnosis(problemType, answers) {
  const text = getAnswersText(answers);

  const mentionsToilet = /toilet|commode/.test(text) || problemType === 'running-toilet';
  const mentionsLeak = /leak|leaking|water|wet|puddle|drip/.test(text);
  const mentionsBase = /\b(base|bottom|floor|around the toilet|under the toilet)\b/.test(text);
  const mentionsRunning = /running|keeps running|refill|refilling|won't stop|wont stop/.test(text);
  const mentionsSink = /sink|faucet|cabinet|under sink|under the cabinet/.test(text);
  const mentionsUnderCabinet = /under (the )?cabinet|under sink|under the sink/.test(text);

  if (mentionsToilet && mentionsLeak && mentionsBase) {
    return {
      likelyIssue:
        'Toilet leaking at the base, most likely from a failed wax ring or loose toilet-to-flange seal',
      confidence: 'High',
      possibleCauses: [
        {
          cause: 'Failed wax ring or toilet base seal',
          likelihood: 'High',
          whyItFits:
            'Water showing up at the bottom/base of the toilet usually points to a failed seal between the toilet and the floor flange.',
          whyItMightNotFit:
            'If water appears even when the toilet has not been flushed, the leak may be from the supply valve, supply line, or tank instead.',
        },
        {
          cause: 'Loose closet bolts or rocking toilet',
          likelihood: 'Medium',
          whyItFits:
            'A loose toilet can break the seal and let flush water seep out at the base.',
          whyItMightNotFit:
            'If the toilet is solid with no movement, loose bolts are less likely.',
        },
        {
          cause: 'Damaged floor flange',
          likelihood: 'Medium',
          whyItFits:
            'A cracked or uneven flange can prevent the toilet from sealing correctly.',
          whyItMightNotFit:
            'The flange usually cannot be confirmed without removing the toilet.',
        },
      ],
      lessLikelyCauses: [
        {
          cause: 'Worn flapper',
          reason:
            'A flapper usually causes running, ghost flushing, or refilling, not water leaking from the base.',
        },
      ],
      recommendedNextCheck:
        'Dry the floor completely, flush once, and watch whether water appears from under the base or drips down from the tank/supply area.',
      safetyWarnings: [
        'Do not keep using the toilet if water is spreading into the flooring.',
        'Avoid overtightening toilet bolts because porcelain can crack.',
      ],
      toolsNeeded: ['Towels', 'Flashlight', 'Adjustable wrench', 'Wax ring or wax-free seal'],
      repairSteps: [
        'Dry the toilet base and surrounding floor.',
        'Flush once while watching the base, tank bolts, and supply line.',
        'If water comes from under the base after flushing, stop using the toilet until the seal is replaced.',
        'Check gently whether the toilet rocks.',
        'If confirmed, shut off water, drain the toilet, remove it, inspect the flange, and replace the seal.',
      ],
      stopAndCallAProIf: [
        'The floor feels soft or swollen.',
        'The flange is cracked or badly corroded.',
        'You see water damage below the bathroom.',
      ],
      difficulty: 'Moderate',
      estimatedTime: '1-3 hours',
      followUpQuestion:
        'Does the water appear mainly after flushing, or is it there even when the toilet has not been used?',
    };
  }

  if (mentionsToilet && mentionsRunning) {
    return {
      likelyIssue:
        'Toilet keeps running, most likely from a worn flapper, fill valve, chain, or float problem',
      confidence: 'High',
      possibleCauses: [
        {
          cause: 'Worn or warped flapper',
          likelihood: 'High',
          whyItFits:
            'A bad flapper lets water leak from the tank into the bowl, causing refilling or running.',
          whyItMightNotFit:
            'If water is leaking onto the floor, a flapper is less likely.',
        },
        {
          cause: 'Fill valve not shutting off',
          likelihood: 'Medium',
          whyItFits:
            'A faulty fill valve can keep sending water into the tank.',
          whyItMightNotFit:
            'If the tank water level is normal and below the overflow tube, it may not be the fill valve.',
        },
      ],
      lessLikelyCauses: [
        {
          cause: 'Wax ring or flange issue',
          reason:
            'Wax ring issues cause leaks at the base, not constant running or refilling.',
        },
      ],
      recommendedNextCheck:
        'Remove the tank lid and check whether water is flowing into the overflow tube or leaking past the flapper.',
      safetyWarnings: ['Set the tank lid somewhere safe because porcelain cracks easily.'],
      toolsNeeded: ['Replacement flapper', 'Adjustable wrench', 'Towel'],
      repairSteps: [
        'Remove the tank lid.',
        'Flush and watch whether the flapper closes fully.',
        'Check chain slack.',
        'Check whether water rises into the overflow tube.',
        'Replace the flapper or adjust/replace the fill valve as needed.',
      ],
      stopAndCallAProIf: [
        'The shutoff valve leaks or will not turn.',
        'The toilet still runs after replacing common tank parts.',
      ],
      difficulty: 'Easy',
      estimatedTime: '20-45 minutes',
      followUpQuestion: 'Is water running into the overflow tube or leaking into the bowl?',
    };
  }

  if (mentionsSink && mentionsLeak && mentionsUnderCabinet) {
    return {
      likelyIssue: 'Loose P-trap connection or worn slip-joint washer',
      confidence: 'Medium',
      possibleCauses: [
        {
          cause: 'Loose or leaking drain trap connection',
          likelihood: 'High',
          whyItFits:
            'Water under the cabinet often comes from the P-trap or slip-nut connections when the sink drains.',
          whyItMightNotFit:
            'If it leaks when no water is running, the supply line or shutoff valve may be more likely.',
        },
        {
          cause: 'Supply line or shutoff valve leak',
          likelihood: 'High',
          whyItFits:
            'A hot/cold supply leak can drip continuously under the cabinet.',
          whyItMightNotFit:
            'If it only leaks while draining, supply lines may not be the source.',
        },
      ],
      lessLikelyCauses: [
        {
          cause: 'Clog only',
          reason:
            'A clog alone does not usually cause under-cabinet leaking unless water escapes from a joint or seal.',
        },
      ],
      recommendedNextCheck:
        'Dry everything, run water, then watch the drain trap, supply lines, shutoff valves, and faucet connections.',
      safetyWarnings: [
        'Do not use nearby outlets or electrical items if water is present.',
        'Turn off shutoff valves before loosening any water connection.',
      ],
      toolsNeeded: [
        'Bucket',
        'Towel or rag',
        'Adjustable wrench or channel-lock pliers',
        'Replacement slip-joint washer (if needed)',
        'Flashlight (optional)',
        'Gloves (optional)',
      ],
      repairSteps: [
        'Place a bucket or towels under the P-trap to catch any water.',
        'Dry the pipes and run a small amount of water to identify exactly where the leak starts.',
        'Hand-tighten the slip-joint nuts first. If needed, use adjustable pliers to tighten gently.',
        'Run water and check whether the leak has stopped.',
      ],
      stopAndCallAProIf: [
        'Water is coming from inside the wall.',
        'A shutoff valve will not close.',
        'Cabinet flooring is swollen or moldy.',
      ],
      difficulty: 'Easy to Moderate',
      estimatedTime: '15-30 minutes',
      followUpQuestion: 'Does it leak only when water drains, or even when the faucet is off?',
    };
  }

  return null;
}

function createQuestion(id, text, options) {
  const normalizedOptions =
    options.includes("I'm not sure") || options.includes('Other')
      ? options
      : [...options, "I'm not sure"];

  return { id, text, options: normalizedOptions };
}

function buildFallbackClarification({ problemType, category, customProblemDescription }) {
  const text = String(customProblemDescription || '').toLowerCase();
  const categoryText = String(category || problemType || '').toLowerCase();

  const mentionsToilet = /toilet|commode/.test(text) || /bathroom|toilet/.test(categoryText);
  const mentionsSink = /sink|faucet|under sink/.test(text) || /kitchen|bathroom|plumb/.test(categoryText);
  const mentionsDryer = /dryer/.test(text) || /laundry/.test(categoryText);
  const mentionsLeak = /leak|drip|water|wet|puddle/.test(text);
  const mentionsBottom = /bottom|base|floor|under/.test(text);

  if (mentionsToilet || (mentionsLeak && mentionsBottom)) {
    return {
      itemOrFixture: mentionsToilet ? 'Toilet' : 'Unknown fixture',
      issueLocation: mentionsBottom ? 'Bottom/base area' : 'Unknown',
      symptom: mentionsLeak ? 'Leaking water' : 'Bathroom fixture problem',
      severity: 'Unknown',
      riskLevel: 'Medium',
      missingInformation: ['Exact water location', 'When the leak happens', 'Whether the toilet moves'],
      needsClarification: true,
      questions: [
        createQuestion('water_location', 'Where do you see the water?', [
          'Around the base on the floor',
          'From the tank',
          'From the wall/shutoff valve',
          "I'm not sure",
        ]),
        createQuestion('leak_timing', 'When does it leak?', [
          'All the time',
          'Only after flushing',
          'Only when someone sits on it',
          "I'm not sure",
        ]),
        createQuestion('toilet_movement', 'Is the toilet loose or rocking?', [
          'Yes',
          'No',
          "I'm not sure",
        ]),
      ],
    };
  }

  if (mentionsDryer) {
    return {
      itemOrFixture: 'Dryer',
      issueLocation: 'Unknown',
      symptom: /smell|odor|burn/.test(text) ? 'Unusual smell' : 'Dryer problem',
      severity: 'Unknown',
      riskLevel: 'High',
      missingInformation: ['Type of smell', 'When it happens', 'Whether there is smoke or excess heat'],
      needsClarification: true,
      questions: [
        createQuestion('smell_type', 'What does the smell seem like?', [
          'Burning lint or dust',
          'Gas or rotten eggs',
          'Electrical or plastic',
          "I'm not sure",
        ]),
        createQuestion('smell_timing', 'When do you notice it?', [
          'As soon as it starts',
          'After it runs for a while',
          'Even when it is off',
          "I'm not sure",
        ]),
        createQuestion('dryer_warning_signs', 'Do you see smoke or feel unusual heat?', [
          'Yes',
          'No',
          "I'm not sure",
        ]),
      ],
    };
  }

  if (mentionsSink) {
    return {
      itemOrFixture: 'Sink or faucet',
      issueLocation: 'Unknown',
      symptom: mentionsLeak ? 'Leaking water' : 'Sink problem',
      severity: 'Unknown',
      riskLevel: 'Medium',
      missingInformation: ['Where the water appears', 'Whether it only leaks while running', 'Whether the P-trap or connections are loose'],
      needsClarification: true,
      questions: [
        createQuestion('sink_water_location', 'Where do you see the water?', [
          'Under the sink',
          'Around the faucet',
          'From the drain',
          'Not sure',
        ]),
        createQuestion('sink_running_only', 'Does it leak only when the water is running?', [
          'Yes',
          'No',
          'Not sure',
        ]),
        createQuestion('sink_p_trap_drip', 'Is water dripping from the curved pipe under the sink?', [
          'Yes',
          'No',
          'Not sure',
        ]),
        createQuestion('sink_loose_connections', 'Do any pipe connections feel loose?', [
          'Yes',
          'No',
          "I haven't checked",
        ]),
        createQuestion('sink_damage_warning', 'Is there corrosion, cracking, or a strong smell?', [
          'Yes',
          'No',
          'Not sure',
        ]),
      ],
    };
  }

  return {
    itemOrFixture: 'Unknown household item',
    issueLocation: 'Unknown',
    symptom: customProblemDescription || 'Unknown problem',
    severity: 'Unknown',
    riskLevel: 'Medium',
    missingInformation: ['Item involved', 'Exact location', 'What happens and when'],
    needsClarification: true,
    questions: [
      createQuestion('item', 'What item or area is having the problem?', [
        'Plumbing fixture',
        'Appliance',
        'Electrical item or outlet',
        'Other',
      ]),
      createQuestion('location', 'Where do you notice the problem?', [
        'At the fixture/appliance',
        'On the floor or wall nearby',
        'Inside a cabinet or behind something',
        "I'm not sure",
      ]),
      createQuestion('symptom', 'What is it doing?', [
        'Leaking or dripping',
        'Making a noise or smell',
        'Not turning on or working',
        'Other',
      ]),
    ],
  };
}

function hasEnoughCustomDetail(customProblemDescription) {
  const text = String(customProblemDescription || '').toLowerCase();

  const hasItem =
    /toilet|sink|faucet|dryer|washer|dishwasher|disposal|thermostat|hvac|outlet|breaker|door|window|wall|ceiling/.test(
      text,
    );

  const hasLocation =
    /base|bottom|tank|bowl|wall|ceiling|under|outlet|breaker|vent|floor|shutoff|hose|drain/.test(
      text,
    );

  const hasSymptom =
    /leak|drip|running|smell|noise|broken|not working|won't|wont|hot|cold|clog|slow|trip/.test(
      text,
    );

  const hasTimingOrSeverity =
    /after|when|only|always|constant|all the time|puddle|smoke|burning|loose|rocking|severe/.test(
      text,
    );

  return hasItem && hasLocation && hasSymptom && hasTimingOrSeverity;
}

async function getClarificationQuestions(payload) {
  const customProblemDescription = String(payload?.customProblemDescription || '').trim();

  if (!customProblemDescription) {
    throw new Error('A customProblemDescription is required.');
  }

  if (hasEnoughCustomDetail(customProblemDescription)) {
    return {
      ...buildFallbackClarification(payload),
      needsClarification: false,
      questions: [],
    };
  }

  try {
    const prompt = buildClarificationPrompt(payload);
    const aiResult = await openaiService.getClarification(prompt);

    if (aiResult) {
      return aiResult.needsClarification && aiResult.questions.length === 0
        ? buildFallbackClarification(payload)
        : aiResult;
    }
  } catch (error) {
    console.warn(
      '[diagnoseService] Clarification unavailable, using fallback:',
      sanitizeErrorMessage(error?.message),
    );
  }

  return buildFallbackClarification(payload);
}

function buildFallbackStopIf(problemType) {
  const byProblemType = {
    'clogged-disposal': [
      'Stop if you smell burning or see damaged wiring.',
      'Stop if water is leaking near outlets or electrical parts.',
      'Stop if the disposal stays jammed after a safe reset attempt.',
    ],
    'tripped-breaker': [
      'Stop if the breaker trips again immediately after one reset.',
      'Stop if you smell burning, see sparks, or the panel feels hot.',
      'Stop if multiple breakers trip or rooms lose power at once.',
    ],
    'dryer-not-heating': [
      'Stop if you smell gas, burning, or see scorched lint.',
      'Stop if the dryer trips the breaker again during testing.',
      'Stop if repair requires opening internal gas or electrical components.',
    ],
  };

  return (
    byProblemType[problemType] || [
      'Stop if the area becomes unsafe or the problem gets worse during inspection.',
      'Stop if the issue involves hidden wiring, inside-wall plumbing, or structural damage.',
      'Stop if you notice burning smells, sparks, or uncontrolled leaking.',
    ]
  );
}

function formatDiagnosis(problemType, diagnosis) {
  const difficulty = normalizeDifficulty(diagnosis.difficulty);
  const likelyIssue = diagnosis.likelyIssue || diagnosis.issue || 'General repair issue';

  const possibleCauses =
    Array.isArray(diagnosis.possibleCauses) && diagnosis.possibleCauses.length > 0
      ? diagnosis.possibleCauses
      : buildLegacyPossibleCauses(diagnosis);

  const lessLikelyCauses =
    Array.isArray(diagnosis.lessLikelyCauses) && diagnosis.lessLikelyCauses.length > 0
      ? diagnosis.lessLikelyCauses
      : buildLegacyLessLikelyCauses(possibleCauses);

  const safetyWarnings =
    Array.isArray(diagnosis.safetyWarnings) && diagnosis.safetyWarnings.length > 0
      ? diagnosis.safetyWarnings
      : diagnosis.safetyWarning
        ? [diagnosis.safetyWarning]
        : ['Stop and make the area safe before attempting a repair.'];

  const rawToolsNeeded =
    Array.isArray(diagnosis.toolsNeeded) && diagnosis.toolsNeeded.length > 0
      ? diagnosis.toolsNeeded
      : Array.isArray(diagnosis.tools) && diagnosis.tools.length > 0
        ? diagnosis.tools
        : ['Basic household tools'];
  const toolsNeeded = isSinkLeakDiagnosis(problemType, diagnosis)
    ? SINK_P_TRAP_TOOLS
    : rawToolsNeeded;

  const repairSteps =
    Array.isArray(diagnosis.troubleshootingSteps) && diagnosis.troubleshootingSteps.length > 0
      ? diagnosis.troubleshootingSteps
      : Array.isArray(diagnosis.repairSteps) && diagnosis.repairSteps.length > 0
        ? diagnosis.repairSteps
        : Array.isArray(diagnosis.steps) && diagnosis.steps.length > 0
          ? diagnosis.steps
          : ['Inspect the area safely before attempting any repair.'];

  const stopAndCallAProIf =
    Array.isArray(diagnosis.stopAndCallAProIf) && diagnosis.stopAndCallAProIf.length > 0
      ? diagnosis.stopAndCallAProIf
      : Array.isArray(diagnosis.stopIf) && diagnosis.stopIf.length > 0
        ? diagnosis.stopIf
        : buildFallbackStopIf(problemType);

  const recommendedNextCheck =
    diagnosis.recommendedNextCheck ||
    diagnosis.followUpQuestion ||
    'Inspect the exact location of the symptom before replacing parts.';

  return {
    likelyIssue,
    issue: likelyIssue,
    confidence: normalizeConfidence(diagnosis.confidence),
    possibleCauses,
    lessLikelyCauses,
    recommendedNextCheck,
    safetyWarnings,
    toolsNeeded,
    troubleshootingSteps: repairSteps,
    repairSteps,
    stopAndCallAProIf,
    whyThisMightBeHappening:
      diagnosis.whyThisMightBeHappening ||
      diagnosis.why ||
      possibleCauses[0]?.whyItFits ||
      'The symptoms point to a likely fault, but the exact source should be confirmed by location.',
    difficulty,
    estimatedTime: diagnosis.estimatedTime || '30-60 minutes',
    tools: toolsNeeded,
    beforeYouStart:
      Array.isArray(diagnosis.beforeYouStart) && diagnosis.beforeYouStart.length > 0
        ? diagnosis.beforeYouStart
        : safetyWarnings,
    safetyWarning:
      typeof diagnosis.safetyWarning === 'string' && diagnosis.safetyWarning.trim()
        ? diagnosis.safetyWarning.trim()
        : safetyWarnings[0],
    mode: diagnosis.mode,
    aiUsed: diagnosis.aiUsed,
    stopIf: stopAndCallAProIf,
    steps: repairSteps,
    callAPro: diagnosis.callAPro || stopAndCallAProIf.join(' '),
    followUpQuestion: diagnosis.followUpQuestion || recommendedNextCheck,
    diySuitability: diagnosis.diySuitability || inferDiySuitability(difficulty),
  };
}

function getQuestions(problemType) {
  const normalizedProblemType = normalizeProblemType(problemType);
  const questions = staticQuestions[normalizedProblemType];

  if (!questions) {
    throw new Error(`Unknown problem type: "${problemType}"`);
  }

  return questions;
}

async function diagnose(problemType, answers) {
  const normalizedProblemType = normalizeProblemType(problemType);
  const normalizedAnswers = normalizeAnswers(answers);

  if (!normalizedProblemType) {
    throw new Error('A problemType is required.');
  }

  if (Object.keys(normalizedAnswers).length === 0) {
    throw new Error('At least one answer is required.');
  }

  const requestKey = JSON.stringify({
    problemType: normalizedProblemType,
    answers: normalizedAnswers,
  });

  if (inFlightDiagnoses.has(requestKey)) {
    return inFlightDiagnoses.get(requestKey);
  }

  const diagnosisPromise = runDiagnosis(normalizedProblemType, normalizedAnswers, problemType);
  inFlightDiagnoses.set(requestKey, diagnosisPromise);

  try {
    return await diagnosisPromise;
  } finally {
    inFlightDiagnoses.delete(requestKey);
  }
}

async function runDiagnosis(normalizedProblemType, normalizedAnswers, originalProblemType) {
  const customProblemDescription = normalizedAnswers.customProblemDescription || '';
  const hasCustomProblemDescription = Boolean(customProblemDescription.trim());

  console.log('[DAD Backend] normalized diagnosis answers:', normalizedAnswers);
  console.log('[DAD Backend] customProblemDescription received:', customProblemDescription);

  // Preset/simple flows can still use fast local logic.
  // Custom input should NOT be blocked by local shortcuts.
  if (!hasCustomProblemDescription) {
    const locationAwareDiagnosis = buildLocationAwareDiagnosis(
      normalizedProblemType,
      normalizedAnswers,
    );

    if (locationAwareDiagnosis) {
      console.log('[DAD Backend] location-aware diagnosis result:', locationAwareDiagnosis);
      return formatDiagnosis(normalizedProblemType, locationAwareDiagnosis);
    }
  } else {
    console.log('USING OPENAI PATH');
    console.log('CUSTOM INPUT:', customProblemDescription);
  }

  try {
    const prompt = buildDiagnosisPrompt(normalizedProblemType, normalizedAnswers);

    console.log('[DAD Backend] OpenAI user prompt:', prompt.userPrompt);
    const openAiCallStartedAtMs = Date.now();
    console.log('[DAD Backend] OpenAI call started:', {
      startedAtIso: new Date(openAiCallStartedAtMs).toISOString(),
      problemType: normalizedProblemType,
    });

    const aiResult = await openaiService.getDiagnosis(
      normalizedProblemType,
      normalizedAnswers,
      prompt,
    );

    console.log('[DAD Backend] OpenAI call succeeded:', {
      elapsedMs: Date.now() - openAiCallStartedAtMs,
      hasResult: Boolean(aiResult),
    });

    console.log('[DAD Backend] RAW OPENAI RESULT:', aiResult);

    if (!aiResult) {
      console.log('RETURNING FREE MODE BECAUSE:', 'OpenAI returned an empty diagnosis result.');
      throw new Error('OpenAI returned an empty diagnosis result.');
    }

    const formattedAiDiagnosis = formatDiagnosis(normalizedProblemType, {
      ...aiResult,
      mode: 'ai',
      aiUsed: true,
    });
    console.log('[DAD Backend] RETURNING AI DIAGNOSIS aiUsed:', formattedAiDiagnosis.aiUsed);
    return formattedAiDiagnosis;
  } catch (error) {
    const safeErrorMessage = sanitizeErrorMessage(error?.message);

    console.error('[diagnoseService] OpenAI diagnosis failed:', {
      name: error?.name || null,
      message: safeErrorMessage,
      code: error?.code || null,
      status: error?.status || null,
      type: error?.type || null,
      requestId: error?.request_id || null,
    });

    if (hasCustomProblemDescription) {
      console.log('RETURNING FREE MODE BECAUSE:', safeErrorMessage);
      console.warn('[diagnoseService] Free Mode: using local custom fallback.');
      return formatDiagnosis(
        normalizedProblemType,
        buildFreeModeCustomDiagnosis(normalizedProblemType, normalizedAnswers),
      );
    }

    console.warn('[diagnoseService] OpenAI unavailable, using fallback data:', safeErrorMessage);
    console.log('RETURNING FREE MODE BECAUSE:', safeErrorMessage);
  }

  const fallback = staticDiagnoses[normalizedProblemType];

  if (!fallback) {
    throw new Error(`No fallback diagnosis found for: "${originalProblemType}"`);
  }

  return formatDiagnosis(normalizedProblemType, fallback);
}

module.exports = {
  getQuestions,
  getClarificationQuestions,
  diagnose,
};
