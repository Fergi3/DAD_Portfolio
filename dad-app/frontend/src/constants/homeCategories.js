const ISSUE_DETAILS = {
  'leaky-sink': {
    id: 'leaky-sink',
    label: 'Leaky Sink',
    icon: '🚰',
  },
  'clogged-disposal': {
    id: 'clogged-disposal',
    label: 'Clogged Disposal',
    icon: '🌀',
  },
  'dishwasher-not-draining': {
    id: 'dishwasher-not-draining',
    label: 'Dishwasher Not Draining',
    icon: '🍽️',
  },
  'running-toilet': {
    id: 'running-toilet',
    label: 'Running Toilet',
    icon: '🚽',
  },
  'washer-leaking': {
    id: 'washer-leaking',
    label: 'Washer Leaking',
    icon: '🫧',
  },
  'dryer-not-heating': {
    id: 'dryer-not-heating',
    label: 'Dryer Not Heating',
    icon: '🔥',
  },
  'thermostat-issues': {
    id: 'thermostat-issues',
    label: 'Thermostat Issues',
    icon: '🌡️',
  },
  'hvac-maintenance': {
    id: 'hvac-maintenance',
    label: 'HVAC Maintenance',
    icon: '❄️',
  },
  'tripped-breaker': {
    id: 'tripped-breaker',
    label: 'Tripped Breaker',
    icon: '⚡',
  },
  'door-hardware': {
    id: 'door-hardware',
    label: 'Door / Locks / Hinges',
    icon: '🚪',
  },
};

const HOME_CATEGORIES = [
  {
    id: 'kitchen',
    title: 'Kitchen',
    subtitle: 'Sinks, disposal, dishwasher',
    icon: '🍽️',
    issues: ['leaky-sink', 'clogged-disposal', 'dishwasher-not-draining'],
  },
  {
    id: 'bathroom',
    title: 'Bathroom',
    subtitle: 'Toilets and sink leaks',
    icon: '🛁',
    issues: ['running-toilet', 'leaky-sink'],
  },
  {
    id: 'laundry',
    title: 'Laundry',
    subtitle: 'Washer and dryer problems',
    icon: '🧺',
    issues: ['washer-leaking', 'dryer-not-heating'],
  },
  {
    id: 'heating-cooling',
    title: 'Heating & Cooling',
    subtitle: 'Thermostat and HVAC care',
    icon: '🌬️',
    issues: ['thermostat-issues', 'hvac-maintenance'],
  },
  {
    id: 'electrical',
    title: 'Electrical',
    subtitle: 'Breaker and power basics',
    icon: '💡',
    issues: ['tripped-breaker'],
  },
  {
    id: 'doors-locks',
    title: 'Doors & Locks',
    subtitle: 'Hardware, hinges, locks',
    icon: '🔐',
    issues: ['door-hardware'],
  },
];

export function getCategoryById(categoryId) {
  return HOME_CATEGORIES.find((category) => category.id === categoryId);
}

export function getIssuesForCategory(categoryId) {
  const category = getCategoryById(categoryId);
  if (!category) return [];

  return category.issues
    .map((issueId) => ISSUE_DETAILS[issueId])
    .filter(Boolean);
}

export default HOME_CATEGORIES;
