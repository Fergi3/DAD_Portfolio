const diagnoseService = require('../services/diagnoseService');
const { success, failure } = require('../utils/responseHelper');

function hasAnswersPayload(answers) {
  if (Array.isArray(answers)) return answers.length > 0;
  return Boolean(answers) && typeof answers === 'object' && Object.keys(answers).length > 0;
}

function hasCustomDescription(customProblemDescription) {
  return typeof customProblemDescription === 'string' && customProblemDescription.trim().length > 0;
}

function addStringFields(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target;

  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      target[key] = value.trim();
    }
  });

  return target;
}

function buildDiagnosisAnswers({ answers, customProblemDescription, context }) {
  const normalizedAnswers = Array.isArray(answers)
    ? answers.reduce((result, answer, index) => {
        if (typeof answer === 'string' && answer.trim()) {
          result[`answer_${index + 1}`] = answer.trim();
        }
        return result;
      }, {})
    : addStringFields({}, answers);

  addStringFields(normalizedAnswers, context);

  if (hasCustomDescription(customProblemDescription)) {
    normalizedAnswers.customProblemDescription = customProblemDescription.trim();
  }

  return normalizedAnswers;
}

exports.getQuestions = async (req, res) => {
  try {
    const { problemType } = req.params;
    const questions = diagnoseService.getQuestions(problemType);
    res.json(success(questions));
  } catch (error) {
    res.status(400).json(failure(error.message));
  }
};

exports.getDiagnosis = async (req, res) => {
  const requestStartedAtMs = Date.now();
  try {
    console.log('[DAD API] /api/diagnose hit:', {
      method: req.method,
      path: req.originalUrl,
      startedAtIso: new Date(requestStartedAtMs).toISOString(),
    });
    console.log('[DAD API] /api/diagnose request body:', req.body);

    const { problemType, answers, customProblemDescription, context } = req.body;

    if (typeof problemType !== 'string' || !problemType.trim()) {
      return res.status(400).json(failure('Request must include problemType as a non-empty string.'));
    }

    if (!hasAnswersPayload(answers) && !hasCustomDescription(customProblemDescription)) {
      return res.status(400).json(
        failure(
          'Request must include answers as a non-empty object/array or customProblemDescription as a non-empty string.',
        ),
      );
    }

    const diagnosisAnswers = buildDiagnosisAnswers({
      answers,
      customProblemDescription,
      context,
    });

    console.log('[DAD API] final payload sent to diagnoseService:', diagnosisAnswers);

    const result = await diagnoseService.diagnose(problemType, diagnosisAnswers);

    const responsePayload = success(result);
    console.log('[DAD API] final response returned to frontend:', {
      elapsedMs: Date.now() - requestStartedAtMs,
      payload: responsePayload,
    });

    res.json(responsePayload);
  } catch (error) {
    console.error('[DAD API] exact error before returning 500:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      cause: error?.cause,
      elapsedMs: Date.now() - requestStartedAtMs,
    });
    res.status(500).json(failure(error.message));
  }
};

exports.getClarificationQuestions = async (req, res) => {
  try {
    const {
      problemType = '',
      category = '',
      customProblemDescription,
      previousAnswers = [],
      imageOrModelData = '',
    } = req.body;

    if (!hasCustomDescription(customProblemDescription)) {
      return res.status(400).json(
        failure('Request must include customProblemDescription as a non-empty string.'),
      );
    }

    const result = await diagnoseService.getClarificationQuestions({
      problemType,
      category,
      customProblemDescription,
      previousAnswers,
      imageOrModelData,
    });

    res.json(success(result));
  } catch (error) {
    res.status(500).json(failure(error.message));
  }
};
