// openaiService.js
// Calls OpenAI and validates the diagnosis JSON before returning it.

const ALLOWED_CONFIDENCE = new Set(['Low', 'Medium', 'High']);
const ALLOWED_LIKELIHOOD = new Set(['Low', 'Medium', 'High']);
const ALLOWED_DIFFICULTY = new Set(['Easy', 'Moderate', 'Hard', 'Pro Recommended']);

const DIAGNOSIS_RESPONSE_FORMAT = {
  name: 'repair_diagnosis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      likelyIssue: { type: 'string' },
      confidence: { type: 'string', enum: ['Low', 'Medium', 'High'] },
      possibleCauses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cause: { type: 'string' },
            likelihood: { type: 'string', enum: ['Low', 'Medium', 'High'] },
            whyItFits: { type: 'string' },
            whyItMightNotFit: { type: 'string' },
          },
          required: ['cause', 'likelihood', 'whyItFits', 'whyItMightNotFit'],
        },
      },
      lessLikelyCauses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cause: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['cause', 'reason'],
        },
      },
      recommendedNextCheck: { type: 'string' },
      safetyWarnings: { type: 'array', items: { type: 'string' } },
      toolsNeeded: { type: 'array', items: { type: 'string' } },
      troubleshootingSteps: { type: 'array', items: { type: 'string' } },
      stopAndCallAProIf: { type: 'array', items: { type: 'string' } },
      difficulty: { type: 'string', enum: ['Easy', 'Moderate', 'Hard', 'Pro Recommended'] },
      estimatedTime: { type: 'string' },
      followUpQuestion: { type: 'string' },
    },
    required: [
      'likelyIssue',
      'confidence',
      'possibleCauses',
      'lessLikelyCauses',
      'recommendedNextCheck',
      'safetyWarnings',
      'toolsNeeded',
      'troubleshootingSteps',
      'stopAndCallAProIf',
      'difficulty',
      'estimatedTime',
      'followUpQuestion',
    ],
  },
};

const CLARIFICATION_RESPONSE_FORMAT = {
  name: 'repair_clarification',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      itemOrFixture: { type: 'string' },
      issueLocation: { type: 'string' },
      symptom: { type: 'string' },
      severity: { type: 'string' },
      riskLevel: { type: 'string', enum: ['Low', 'Medium', 'High'] },
      missingInformation: { type: 'array', items: { type: 'string' } },
      needsClarification: { type: 'boolean' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'text', 'options'],
        },
      },
    },
    required: [
      'itemOrFixture',
      'issueLocation',
      'symptom',
      'severity',
      'riskLevel',
      'missingInformation',
      'needsClarification',
      'questions',
    ],
  },
};

let attemptedClientLoad = false;
let cachedClient = null;

function sanitizeErrorMessage(message) {
  if (typeof message !== 'string') {
    return 'OpenAI request failed.';
  }

  // Redact any key-like patterns if an upstream SDK includes them in error text.
  return message.replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]');
}

function createClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[openaiService] OPENAI_API_KEY is not set. Using fallback diagnosis.');
    return null;
  }

  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn('[openaiService] openai package is not installed. Using fallback diagnosis.');
      return null;
    }
    throw error;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getClient() {
  if (!attemptedClientLoad) {
    cachedClient = createClient();
    attemptedClientLoad = true;
  }

  return cachedClient;
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Field "${fieldName}" must be a non-empty string.`);
  }
  return value.trim();
}

function requireEnum(value, fieldName, allowedValues) {
  const normalizedValue = requireNonEmptyString(value, fieldName);
  if (!allowedValues.has(normalizedValue)) {
    throw new Error(`Field "${fieldName}" must be one of: ${Array.from(allowedValues).join(', ')}.`);
  }
  return normalizedValue;
}

function requireStringArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Field "${fieldName}" must be a non-empty array of strings.`);
  }
  return value.map((item) => requireNonEmptyString(item, `${fieldName}[]`));
}

function createInvalidAiResponseError(message) {
  const error = new Error(message);
  error.code = 'INVALID_AI_RESPONSE';
  return error;
}

function extractMessageText(message) {
  if (typeof message?.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message?.content)) {
    const joinedText = message.content
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim();

    if (joinedText) return joinedText;
  }

  throw new Error('OpenAI returned empty content.');
}

function requirePossibleCauses(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('possibleCauses must be a non-empty array.');
  }

  return value.map((item, index) => ({
    cause: requireNonEmptyString(item?.cause, `possibleCauses[${index}].cause`),
    likelihood: requireEnum(item?.likelihood, `possibleCauses[${index}].likelihood`, ALLOWED_LIKELIHOOD),
    whyItFits: requireNonEmptyString(item?.whyItFits, `possibleCauses[${index}].whyItFits`),
    whyItMightNotFit: requireNonEmptyString(
      item?.whyItMightNotFit,
      `possibleCauses[${index}].whyItMightNotFit`,
    ),
  }));
}

function requireLessLikelyCauses(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('lessLikelyCauses must be a non-empty array.');
  }

  return value.map((item, index) => ({
    cause: requireNonEmptyString(item?.cause, `lessLikelyCauses[${index}].cause`),
    reason: requireNonEmptyString(item?.reason, `lessLikelyCauses[${index}].reason`),
  }));
}

function validateDiagnosisJson(payload) {
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Diagnosis response must be a JSON object.');
    }

    const troubleshootingSteps = requireStringArray(
      payload.troubleshootingSteps || payload.repairSteps,
      'troubleshootingSteps',
    );

    return {
      likelyIssue: requireNonEmptyString(payload.likelyIssue, 'likelyIssue'),
      confidence: requireEnum(payload.confidence, 'confidence', ALLOWED_CONFIDENCE),
      possibleCauses: requirePossibleCauses(payload.possibleCauses),
      lessLikelyCauses: requireLessLikelyCauses(payload.lessLikelyCauses),
      recommendedNextCheck: requireNonEmptyString(payload.recommendedNextCheck, 'recommendedNextCheck'),
      safetyWarnings: requireStringArray(payload.safetyWarnings, 'safetyWarnings'),
      toolsNeeded: requireStringArray(payload.toolsNeeded, 'toolsNeeded'),
      troubleshootingSteps,
      repairSteps: troubleshootingSteps,
      stopAndCallAProIf: requireStringArray(payload.stopAndCallAProIf, 'stopAndCallAProIf'),
      difficulty: requireEnum(payload.difficulty, 'difficulty', ALLOWED_DIFFICULTY),
      estimatedTime: requireNonEmptyString(payload.estimatedTime, 'estimatedTime'),
      followUpQuestion: requireNonEmptyString(payload.followUpQuestion, 'followUpQuestion'),
    };
  } catch (error) {
    throw createInvalidAiResponseError(`Invalid AI response: ${error.message}`);
  }
}

function requireClarificationQuestions(value) {
  if (!Array.isArray(value)) {
    throw new Error('Clarification field "questions" must be an array.');
  }

  return value.map((item, index) => ({
    id: requireNonEmptyString(item?.id, `questions[${index}].id`),
    text: requireNonEmptyString(item?.text, `questions[${index}].text`),
    options: requireStringArray(item?.options, `questions[${index}].options`),
  }));
}

function validateClarificationJson(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Clarification response must be a JSON object.');
  }

  if (typeof payload.needsClarification !== 'boolean') {
    throw new Error('Clarification field "needsClarification" must be a boolean.');
  }

  return {
    itemOrFixture: requireNonEmptyString(payload.itemOrFixture, 'itemOrFixture'),
    issueLocation: requireNonEmptyString(payload.issueLocation, 'issueLocation'),
    symptom: requireNonEmptyString(payload.symptom, 'symptom'),
    severity: requireNonEmptyString(payload.severity, 'severity'),
    riskLevel: requireEnum(payload.riskLevel, 'riskLevel', ALLOWED_CONFIDENCE),
    missingInformation: requireStringArray(payload.missingInformation, 'missingInformation'),
    needsClarification: payload.needsClarification,
    questions: requireClarificationQuestions(payload.questions),
  };
}

async function getDiagnosis(problemType, answers, prompt) {
  const client = getClient();

  if (!client) {
    console.log('RETURNING FREE MODE BECAUSE:', 'OpenAI client unavailable');
    return null;
  }

  let completion;

  try {
    console.log('🧠 AI CALL STARTED');
    console.log('[DAD OpenAI] diagnosis request:', {
      problemType,
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    });

    completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: DIAGNOSIS_RESPONSE_FORMAT,
      },
    });

    console.log('🧠 AI CALL SUCCESS');
  } catch (error) {
    console.error('[DAD OpenAI] diagnosis request failed:', {
      status: error?.status || null,
      code: error?.code || null,
      type: error?.type || null,
      requestId: error?.request_id || null,
      message: sanitizeErrorMessage(error?.message),
    });
    throw error;
  }

  const message = completion.choices?.[0]?.message;

  if (!message) {
    throw new Error(`OpenAI returned no diagnosis for "${problemType}".`);
  }

  if (message.refusal) {
    throw new Error(`OpenAI refused the diagnosis request: ${message.refusal}`);
  }

  const rawDiagnosisText = extractMessageText(message);
  console.log('[DAD OpenAI] raw response text:', rawDiagnosisText);

  let parsedDiagnosis;

  try {
    parsedDiagnosis = JSON.parse(rawDiagnosisText);
  } catch (error) {
    console.error('[DAD OpenAI] JSON parse failed:', rawDiagnosisText);
    throw createInvalidAiResponseError(`Invalid AI response: ${error.message}`);
  }

  return validateDiagnosisJson(parsedDiagnosis);
}

async function getClarification(prompt) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0.1,
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: prompt.userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: CLARIFICATION_RESPONSE_FORMAT,
    },
  });

  const message = completion.choices?.[0]?.message;

  if (!message) {
    throw new Error('OpenAI returned no clarification questions.');
  }

  if (message.refusal) {
    throw new Error(`OpenAI refused the clarification request: ${message.refusal}`);
  }

  let parsedClarification;

  try {
    parsedClarification = JSON.parse(extractMessageText(message));
  } catch (error) {
    throw new Error(`OpenAI returned invalid clarification JSON: ${error.message}`);
  }

  return validateClarificationJson(parsedClarification);
}

module.exports = {
  getDiagnosis,
  getClarification,
};