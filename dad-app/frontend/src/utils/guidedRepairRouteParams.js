export function buildRepairCompleteRouteParams({
  activeDiagnosis,
  label,
  categoryTitle,
  activeRepairTodoId,
}) {
  return {
    diagnosis: activeDiagnosis,
    label,
    categoryTitle,
    repairTodoId: activeRepairTodoId,
  };
}

export function buildConnectProRouteParams({ activeDiagnosis, label, categoryTitle }) {
  return {
    diagnosis: activeDiagnosis,
    label,
    categoryTitle,
  };
}

export function buildToolsForRepairRouteParams({
  activeRepairTodoId,
  activeDiagnosis,
  diagnosis,
  label,
  categoryTitle,
}) {
  return {
    repairId: activeRepairTodoId,
    recommendedTools: activeDiagnosis?.tools || [],
    sourceRepair: diagnosis?.issue || label,
    diagnosis: activeDiagnosis,
    label,
    categoryTitle,
    repairEntryPoint: 'continue',
  };
}
