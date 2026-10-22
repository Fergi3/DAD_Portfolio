import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  RUNNING_TOILET_KEY,
  RUNNING_TOILET_TOOLS,
  SINK_P_TRAP_LEAK_KEY,
  SINK_P_TRAP_LEAK_TOOLS,
} from '../data/diagnosisLibrary';
import demoQuestions from '../data/demoQuestions';

// diagnoseService.js
// All HTTP communication between the frontend and the backend.
// Screens import and call these functions - they never call fetch() directly.
//
// API resolution strategy:
// 1) EXPO_PUBLIC_API_URL, if set (recommended for team/dev consistency)
// 2) Expo host LAN IP on port 3000 (best for physical devices)
// 3) Browser hostname on port 3000 for web development
// 4) localhost:3000 as a final fallback (simulators/local testing)

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

const QUESTIONS_TIMEOUT_MS = 1500;
const DIAGNOSIS_TIMEOUT_MS = 45000;
const MAX_CONTEXT_VALUE_LENGTH = 4000;
const questionsCache = new Map();
const inFlightQuestions = new Map();
const clarificationCache = new Map();
const inFlightClarifications = new Map();
const inFlightDiagnoses = new Map();

function resolveBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return normalizeBaseUrl(envUrl);

  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ].filter(Boolean);

  const hostUri = hostCandidates.find(Boolean) || null;
  const host = hostUri ? hostUri.split(':')[0] : null;
  if (host) return `http://${host}:3000`;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

const BASE_URL = resolveBaseUrl();

function isNetworkFailure(error) {
  return error instanceof TypeError;
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

function shouldUseDemoFallback(error) {
  return isNetworkFailure(error) || isAbortError(error);
}

function normalizeContextValue(value) {
  if (typeof value !== 'string') return '';

  const trimmedValue = value.trim();
  if (trimmedValue.length <= MAX_CONTEXT_VALUE_LENGTH) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, MAX_CONTEXT_VALUE_LENGTH)}\n[Truncated for performance]`;
}

async function fetchWithTimeout(url, options, timeoutMs = QUESTIONS_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getDemoQuestions(problemType) {
  const questions = demoQuestions[problemType];
  if (!questions) {
    throw new Error(`Unknown problem type: "${problemType}"`);
  }
  return questions;
}

export function getApiBaseUrl() {
  return BASE_URL;
}

async function parseJsonResponse(response, fallbackMessage) {
  const raw = await response.text();
  console.log('[DAD API] raw API response:', raw);

  try {
    const json = JSON.parse(raw);
    console.log('[DAD API] parsed API response:', json);
    if (!response.ok || json.ok === false) {
      throw new Error(json.error || fallbackMessage);
    }
    return Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(fallbackMessage);
    }
    throw error;
  }
}

function normalizeStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`Diagnosis API response is missing ${fieldName}.`);
  }

  return value.filter((item) => typeof item === 'string' && item.trim());
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

function isRunningToiletDiagnosis(problemType, diagnosis) {
  const text = [
    problemType,
    diagnosis?.issue,
    diagnosis?.likelyIssue,
    diagnosis?.yourDiagnosis,
    diagnosis?.recommendedNextCheck,
    diagnosis?.followUpQuestion,
  ].join(' ').toLowerCase();

  return /running-toilet|toilet|tank|flapper|fill valve|overflow tube|flush/.test(text) && /running|runs|refill|refilling|hissing|trickling|flapper|overflow/.test(text);
}

function normalizeDiagnosisResponse(diagnosis, problemType = '') {
  console.log('Diagnosis API response:', diagnosis);

  if (!diagnosis || typeof diagnosis !== 'object' || Array.isArray(diagnosis)) {
    throw new Error('Diagnosis API response was empty or invalid.');
  }

  if (typeof diagnosis.likelyIssue !== 'string' || !diagnosis.likelyIssue.trim()) {
    throw new Error('Diagnosis API response is missing likelyIssue.');
  }

  const troubleshootingSteps = normalizeStringArray(
    diagnosis.troubleshootingSteps || diagnosis.repairSteps || diagnosis.steps,
    'troubleshootingSteps',
  );
  const toolsNeeded = normalizeStringArray(diagnosis.toolsNeeded || diagnosis.tools, 'toolsNeeded');
  const safetyWarnings = normalizeStringArray(
    diagnosis.safetyWarnings || diagnosis.beforeYouStart,
    'safetyWarnings',
  );

  const isSinkLeak = isSinkLeakDiagnosis(problemType, diagnosis);
  const isRunningToilet = isRunningToiletDiagnosis(problemType, diagnosis);
  const normalizedToolsNeeded = isSinkLeak
    ? SINK_P_TRAP_LEAK_TOOLS
    : isRunningToilet
      ? RUNNING_TOILET_TOOLS
      : toolsNeeded;

  return {
    ...diagnosis,
    diagnosisKey: diagnosis.diagnosisKey || (isSinkLeak ? SINK_P_TRAP_LEAK_KEY : isRunningToilet ? RUNNING_TOILET_KEY : undefined),
    likelyIssue: diagnosis.likelyIssue.trim(),
    issue: diagnosis.issue || diagnosis.likelyIssue.trim(),
    troubleshootingSteps,
    repairSteps: troubleshootingSteps,
    steps: troubleshootingSteps,
    toolsNeeded: normalizedToolsNeeded,
    tools: normalizedToolsNeeded,
    safetyWarnings,
    beforeYouStart: safetyWarnings,
    safetyWarning: diagnosis.safetyWarning || safetyWarnings[0],
  };
}

/**
 * Fetches the diagnostic questions for a given problem type.
 * @param {string} problemType - e.g. 'leaky-sink'
 * @returns {Array} array of question objects { id, text, options }
 */
export async function fetchQuestions(problemType) {
  if (questionsCache.has(problemType)) {
    return questionsCache.get(problemType);
  }

  if (inFlightQuestions.has(problemType)) {
    return inFlightQuestions.get(problemType);
  }

  const questionsPromise = (async () => {
    try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/questions/${problemType}`);
    const questions = await parseJsonResponse(response, 'Failed to load questions.');
    questionsCache.set(problemType, questions);
    return questions;
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        const questions = getDemoQuestions(problemType);
        questionsCache.set(problemType, questions);
        return questions;
      }
      throw error;
    }
  })();

  inFlightQuestions.set(problemType, questionsPromise);

  try {
    return await questionsPromise;
  } finally {
    inFlightQuestions.delete(problemType);
  }
}

function getFallbackClarification(payload) {
  const text = `${payload.customProblemDescription || ''} ${payload.category || ''}`.toLowerCase();
  const isToilet = /toilet|bathroom|bottom|base/.test(text);
  const isSinkLeak = /sink|faucet|drain|pipe|p-trap|ptrap|p trap/.test(text) && /leak|leaking|drip|water|wet|puddle/.test(text);

  if (isSinkLeak) {
    return {
      itemOrFixture: /faucet/.test(text) ? 'Faucet' : 'Sink',
      issueLocation: /under|p-trap|ptrap|p trap|pipe/.test(text) ? 'Under sink / drain pipe' : 'Unknown',
      symptom: 'Leaking water',
      severity: 'Unknown',
      riskLevel: 'Medium',
      missingInformation: ['Where the water appears', 'Whether it only leaks while running', 'Whether the P-trap or connections are loose'],
      needsClarification: true,
      questions: [
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
      ],
    };
  }

  if (isToilet) {
    return {
      itemOrFixture: /toilet/.test(text) ? 'Toilet' : 'Unknown fixture',
      issueLocation: /bottom|base/.test(text) ? 'Bottom/base area' : 'Unknown',
      symptom: /leak|water|drip/.test(text) ? 'Leaking water' : 'Unknown problem',
      severity: 'Unknown',
      riskLevel: 'Medium',
      missingInformation: ['Exact water location', 'When it leaks', 'Whether the toilet moves'],
      needsClarification: true,
      questions: [
        {
          id: 'water_location',
          text: 'Where do you see the water?',
          options: [
            'Around the base on the floor',
            'From the tank',
            'From the wall/shutoff valve',
            "I'm not sure",
          ],
        },
        {
          id: 'leak_timing',
          text: 'When does it leak?',
          options: ['All the time', 'Only after flushing', 'Only when someone sits on it', "I'm not sure"],
        },
        {
          id: 'toilet_movement',
          text: 'Is the toilet loose or rocking?',
          options: ['Yes', 'No', "I'm not sure"],
        },
      ],
    };
  }

  return {
    itemOrFixture: 'Unknown household item',
    issueLocation: 'Unknown',
    symptom: payload.customProblemDescription || 'Unknown problem',
    severity: 'Unknown',
    riskLevel: 'Medium',
    missingInformation: ['Item involved', 'Exact location', 'What happens and when'],
    needsClarification: true,
    questions: [
      {
        id: 'item',
        text: 'What item or area is having the problem?',
        options: ['Plumbing fixture', 'Appliance', 'Electrical item or outlet', 'Other'],
      },
      {
        id: 'location',
        text: 'Where do you notice the problem?',
        options: ['At the fixture/appliance', 'On the floor or wall nearby', 'Inside a cabinet or behind something', "I'm not sure"],
      },
      {
        id: 'symptom',
        text: 'What is it doing?',
        options: ['Leaking or dripping', 'Making a noise or smell', 'Not turning on or working', 'Other'],
      },
    ],
  };
}

export async function fetchClarificationQuestions(payload) {
  const requestBody = {
    problemType: payload.problemType || '',
    category: payload.category || '',
    customProblemDescription: payload.customProblemDescription || '',
    previousAnswers: Array.isArray(payload.previousAnswers) ? payload.previousAnswers : [],
    imageOrModelData: payload.imageOrModelData || '',
  };
  const cacheKey = JSON.stringify(requestBody);

  if (clarificationCache.has(cacheKey)) {
    return clarificationCache.get(cacheKey);
  }

  if (inFlightClarifications.has(cacheKey)) {
    return inFlightClarifications.get(cacheKey);
  }

  const clarificationPromise = (async () => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }, DIAGNOSIS_TIMEOUT_MS);
      return await parseJsonResponse(response, 'Failed to load clarification questions.');
    } catch (error) {
      if (shouldUseDemoFallback(error)) {
        return getFallbackClarification(requestBody);
      }
      throw error;
    }
  })();

  inFlightClarifications.set(cacheKey, clarificationPromise);

  try {
    const clarification = await clarificationPromise;
    clarificationCache.set(cacheKey, clarification);
    return clarification;
  } finally {
    inFlightClarifications.delete(cacheKey);
  }
}

/**
 * Submits the user's answers and returns a diagnosis result.
 * @param {string}   problemType - e.g. 'leaky-sink'
 * @param {string[]} answers     - array of the user's selected answer strings
 * @param {string} [customProblemDescription] - optional user-entered issue details
 * @param {object} [context] - optional category, image/model, or skill context
 * @returns {object} diagnosis result { issue, confidence, difficulty, ... }
 */
export async function submitAnswers(
  problemType,
  answers,
  customProblemDescription = '',
  context = {},
) {
  const requestStartedAtMs = Date.now();
  const trimmedDescription = customProblemDescription.trim();
  const extraContext = Object.entries(context).reduce((result, [key, value]) => {
    const normalizedValue = normalizeContextValue(value);
    if (normalizedValue) {
      result[key] = normalizedValue;
    }
    return result;
  }, {});
  const shouldSendObjectPayload = trimmedDescription || Object.keys(extraContext).length > 0;
  const normalizedAnswers = Array.isArray(answers) ? answers : [];
  const answersPayload = shouldSendObjectPayload
    ? {
        ...normalizedAnswers.reduce((result, answer, index) => {
          result[`answer_${index + 1}`] = answer;
          return result;
        }, {}),
        ...extraContext,
        customProblemDescription: trimmedDescription,
      }
    : answers;

  const requestBody = {
    problemType,
    answers: answersPayload,
    ...(trimmedDescription ? { customProblemDescription: trimmedDescription } : {}),
  };
  const cacheKey = JSON.stringify(requestBody);

  console.log('[DAD API] diagnosis request start:', {
    startedAtIso: new Date(requestStartedAtMs).toISOString(),
    timeoutMs: DIAGNOSIS_TIMEOUT_MS,
    baseUrl: BASE_URL,
  });
  console.log('CUSTOM TEXT:', trimmedDescription);
  console.log('PAYLOAD SENT:', requestBody);
  console.log('[DAD API] customProblemDescription:', trimmedDescription);
  console.log('[DAD API] diagnosis request payload:', requestBody);

  if (inFlightDiagnoses.has(cacheKey)) {
    return inFlightDiagnoses.get(cacheKey);
  }

  const diagnosisPromise = (async () => {
    try {
      const endpoint = `${BASE_URL}/api/diagnose`;
      console.log('Calling diagnosis endpoint:', endpoint);
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }, DIAGNOSIS_TIMEOUT_MS);
      console.log('[DAD API] diagnosis response status:', {
        status: response.status,
        ok: response.ok,
        elapsedMs: Date.now() - requestStartedAtMs,
      });
      console.log('[DAD API] diagnosis raw response body:', await response.clone().text());
      const diagnosis = await parseJsonResponse(response, 'Failed to get diagnosis.');
      console.log('[DAD API] diagnosis parsed response body:', diagnosis);
      const normalizedDiagnosis = normalizeDiagnosisResponse(diagnosis, problemType);
      console.log('[DAD API] diagnosis normalized response body:', normalizedDiagnosis);
      return normalizedDiagnosis;
    } catch (error) {
      console.error('[DAD API] diagnosis request failed (exact):', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        cause: error?.cause,
        elapsedMs: Date.now() - requestStartedAtMs,
        timedOut: isAbortError(error),
        timeoutMs: DIAGNOSIS_TIMEOUT_MS,
      });
      throw error;
    }
  })();

  inFlightDiagnoses.set(cacheKey, diagnosisPromise);

  try {
    const diagnosis = await diagnosisPromise;
    console.log('[DAD API] final diagnosis object from service:', diagnosis);
    return diagnosis;
  } finally {
    inFlightDiagnoses.delete(cacheKey);
  }
}

export function createDiagnosisRequest(
  problemType,
  answers,
  customProblemDescription = '',
  context = {},
) {
  const trimmedDescription = customProblemDescription.trim();
  const trimmedContext = Object.entries(context).reduce((result, [key, value]) => {
    const normalizedValue = normalizeContextValue(value);
    if (normalizedValue) {
      result[key] = normalizedValue;
    }
    return result;
  }, {});

  return {
    problemType,
    answers: Array.isArray(answers) ? answers : [],
    customProblemDescription: trimmedDescription,
    context: trimmedContext,
  };
}
