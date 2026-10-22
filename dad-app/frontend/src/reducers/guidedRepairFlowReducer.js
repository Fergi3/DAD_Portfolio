export const GUIDED_REPAIR_FLOW_ACTIONS = {
  ADVANCE_STEP: 'ADVANCE_STEP',
  MARK_GUIDE_COMPLETE: 'MARK_GUIDE_COMPLETE',
  TOGGLE_CHECKLIST_PART: 'TOGGLE_CHECKLIST_PART',
  SIMPLE_FIX_WORKED: 'SIMPLE_FIX_WORKED',
  SIMPLE_FIX_FAILED: 'SIMPLE_FIX_FAILED',
  SELECT_SINK_LEAK_LOCATION: 'SELECT_SINK_LEAK_LOCATION',
  SELECT_GENERIC_FOLLOW_UP: 'SELECT_GENERIC_FOLLOW_UP',
  GO_TO_PREVIOUS_STEP: 'GO_TO_PREVIOUS_STEP',
  RESET_FOR_DIAGNOSIS_CHANGE: 'RESET_FOR_DIAGNOSIS_CHANGE',
  RESTORE_LEGACY_LEAK_LOCATION: 'RESTORE_LEGACY_LEAK_LOCATION',
};

const OUTCOME_RESET = {
  finalDecision: null,
  leakSource: null,
  showFinishButton: false,
  repairFollowUpAnswer: '',
};

const CHECKPOINT_RESET = {
  fixFollowUpVisible: false,
  simpleFixCheckpointComplete: false,
  showFinishButton: false,
  finalDecision: null,
  repairFollowUpAnswer: '',
  leakSource: null,
};

export function createInitialGuidedRepairFlowState({
  initialStepIndex = 0,
  resumedCompletedParts = {},
  initialSinkLeakDetailSteps = [],
}) {
  return {
    currentStepIndex: initialStepIndex,
    completedParts: resumedCompletedParts,
    sinkLeakDetailSteps: initialSinkLeakDetailSteps,
    fixFollowUpVisible: false,
    simpleFixCheckpointComplete: false,
    repairFollowUpAnswer: '',
    showFinishButton: false,
    finalDecision: null,
    leakSource: null,
    isComplete: false,
  };
}

export default function guidedRepairFlowReducer(state, action) {
  switch (action.type) {
    case GUIDED_REPAIR_FLOW_ACTIONS.ADVANCE_STEP:
      return {
        ...state,
        ...(action.resetOutcomeDecision ? OUTCOME_RESET : null),
        currentStepIndex: state.currentStepIndex + 1,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.MARK_GUIDE_COMPLETE:
      return {
        ...state,
        isComplete: true,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.TOGGLE_CHECKLIST_PART:
      return {
        ...state,
        completedParts: {
          ...state.completedParts,
          [action.partKey]: !state.completedParts[action.partKey],
        },
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.SIMPLE_FIX_WORKED:
      return {
        ...state,
        finalDecision: 'yes',
        showFinishButton: true,
        fixFollowUpVisible: false,
        repairFollowUpAnswer: '',
        leakSource: null,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.SIMPLE_FIX_FAILED:
      return {
        ...state,
        finalDecision: 'no',
        fixFollowUpVisible: true,
        showFinishButton: false,
        repairFollowUpAnswer: '',
        leakSource: null,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.SELECT_SINK_LEAK_LOCATION:
      return {
        ...state,
        leakSource: action.option,
        repairFollowUpAnswer: action.option,
        ...(action.detailSteps.length > 0
          ? {
              sinkLeakDetailSteps: action.detailSteps,
              fixFollowUpVisible: false,
              simpleFixCheckpointComplete: true,
              currentStepIndex: action.stepIndex,
            }
          : null),
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.SELECT_GENERIC_FOLLOW_UP:
      return {
        ...state,
        repairFollowUpAnswer: action.option,
        fixFollowUpVisible: false,
        simpleFixCheckpointComplete: true,
        currentStepIndex: action.shouldAdvance
          ? state.currentStepIndex + 1
          : state.currentStepIndex,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.GO_TO_PREVIOUS_STEP:
      return {
        ...state,
        ...(action.resetMode === 'outcome' ? OUTCOME_RESET : null),
        ...(action.resetMode === 'checkpoint' ? CHECKPOINT_RESET : null),
        currentStepIndex: action.stepIndex,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.RESET_FOR_DIAGNOSIS_CHANGE:
      return {
        ...state,
        ...CHECKPOINT_RESET,
      };

    case GUIDED_REPAIR_FLOW_ACTIONS.RESTORE_LEGACY_LEAK_LOCATION:
      return {
        ...state,
        sinkLeakDetailSteps: action.detailSteps,
        repairFollowUpAnswer: action.option,
        leakSource: action.option,
        simpleFixCheckpointComplete: true,
        currentStepIndex: action.stepIndex,
      };

    default:
      return state;
  }
}
