import AsyncStorage from '@react-native-async-storage/async-storage';

const TOOLS_STORAGE_KEY = 'dad_tool_inventory';
const SHOPPING_STORAGE_KEY = 'dad_shopping_list';
const TODO_STORAGE_KEY = 'dad_repairs_todo';

const DEFAULT_TOOLS = [
  { id: 'tool-1', name: 'Adjustable Wrench', owned: true, category: 'Hand Tools' },
  { id: 'tool-2', name: 'Phillips Screwdriver', owned: true, category: 'Hand Tools' },
  { id: 'tool-3', name: 'Bucket', owned: true, category: 'Project Supplies' },
  { id: 'tool-4', name: 'Flashlight', owned: true, category: 'Hand Tools' },
  { id: 'tool-5', name: 'Cordless Drill', owned: true, category: 'Power Tools' },
  { id: 'tool-6', name: 'Tape Measure', owned: true, category: 'Hand Tools' },
  { id: 'tool-7', name: 'Level', owned: true, category: 'Hand Tools' },
  { id: 'tool-8', name: 'Pliers', owned: true, category: 'Hand Tools' },
  { id: 'tool-9', name: 'Utility Knife', owned: true, category: 'Hand Tools' },
  { id: 'tool-10', name: 'Hammer', owned: true, category: 'Hand Tools' },
  { id: 'tool-11', name: 'Safety Glasses', owned: true, category: 'Safety Gear' },
  { id: 'tool-12', name: 'Work Gloves', owned: false, category: 'Safety Gear' },
];

const DEFAULT_SHOPPING_ITEMS = [
  { id: 'shop-1', name: 'Plumber Tape', complete: false, status: 'needed', source: 'manual', sourceRepair: 'Leaky Sink' },
  { id: 'shop-2', name: 'Replacement Faucet Washer', complete: false, status: 'needed', source: 'manual', sourceRepair: 'Leaky Sink' },
  { id: 'shop-3', name: 'Air Filter 16x20x1', complete: false, status: 'needed', source: 'manual', sourceRepair: 'HVAC Tune-Up' },
];

const DEFAULT_TODO_REPAIRS = [
  buildRepairTodo({
    id: 'todo-1',
    name: 'Fix guest bathroom faucet',
    label: 'Guest Bathroom Faucet',
    categoryTitle: 'Plumbing',
    steps: [
      'Turn off the water supply under the sink.',
      'Remove the faucet handle and inspect the worn washer or cartridge.',
      'Install the replacement part and tighten the fixture carefully.',
      'Turn the water back on and test for leaks.',
    ],
    tools: ['Adjustable Wrench', 'Bucket', 'Towels', 'Safety Glasses'],
  }),
  buildRepairTodo({
    id: 'todo-2',
    name: 'Seal drafty back door',
    label: 'Back Door Draft',
    categoryTitle: 'Doors and Windows',
    steps: [
      'Inspect the door frame and identify where air is leaking in.',
      'Clean the frame and remove any worn weather stripping.',
      'Install fresh weather stripping and press it firmly into place.',
      'Close the door and test the seal from top to bottom.',
    ],
    tools: ['Tape Measure', 'Utility Knife', 'Work Gloves'],
  }),
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeListName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function mergeSourceRepair(currentSource, nextSource) {
  const sources = [currentSource, nextSource]
    .flatMap((source) => String(source || '').split(','))
    .map((source) => source.trim())
    .filter(Boolean);
  return [...new Set(sources)].join(', ') || 'Manual add';
}

function dedupeShoppingItems(items) {
  const dedupedItems = [];
  const itemByName = new Map();

  items.forEach((item) => {
    const normalizedName = normalizeListName(item.name);
    if (!normalizedName) return;

    const existingItem = itemByName.get(normalizedName);

    if (!existingItem) {
      const nextItem = {
        ...item,
        name: String(item.name || '').trim(),
        status: item.status || 'needed',
        source: item.source || 'manual',
        sourceRepair: item.sourceRepair || 'Manual add',
      };
      itemByName.set(normalizedName, nextItem);
      dedupedItems.push(nextItem);
      return;
    }

    existingItem.complete = Boolean(existingItem.complete || item.complete);
    existingItem.status = existingItem.status || item.status || 'needed';
    existingItem.source = existingItem.source === 'repair' || item.source === 'repair' ? 'repair' : existingItem.source || item.source || 'manual';
    existingItem.repairId = existingItem.repairId || item.repairId;
    existingItem.sourceRepair = mergeSourceRepair(existingItem.sourceRepair, item.sourceRepair);
  });

  return dedupedItems;
}

function buildRepairTodo({
  id = createId('todo'),
  name,
  complete = false,
  label,
  categoryTitle = 'Saved Project',
  steps,
  tools = [],
  diagnosis,
  currentStepIndex = 0,
  completedParts = {},
  status,
  lastOpenedAt,
  totalSteps,
  progressPercentage,
  toolsParts,
}) {
  const repairName = String(name || diagnosis?.issue || label || 'Saved repair').trim();
  const fallbackSteps = [
    `Inspect the area for the problem related to ${repairName.toLowerCase()}.`,
    'Gather the tools and replacement parts you may need before continuing.',
    'Work through the repair carefully and tighten or replace any worn parts.',
    'Test the repair and confirm the issue is fully resolved.',
  ];

  const repairDiagnosis =
    diagnosis || {
      issue: name,
      steps: steps && steps.length ? steps : fallbackSteps,
      tools,
      stopIf: [],
    };
  const stepCount = Math.max(
    1,
    Number(totalSteps) ||
      repairDiagnosis?.steps?.length ||
      repairDiagnosis?.troubleshootingSteps?.length ||
      repairDiagnosis?.repairSteps?.length ||
      fallbackSteps.length,
  );
  const boundedStepIndex = Math.max(0, Math.min(Number(currentStepIndex) || 0, stepCount - 1));
  const percentage = Math.round(((boundedStepIndex + 1) / stepCount) * 100);

  return {
    id,
    name: repairName,
    complete: Boolean(complete),
    status: status || (complete ? 'completed' : 'in_progress'),
    label: label || titleCase(repairName),
    categoryTitle,
    diagnosis: repairDiagnosis,
    currentStepIndex: boundedStepIndex,
    currentStepNumber: boundedStepIndex + 1,
    totalSteps: stepCount,
    progressPercentage: Number(progressPercentage) || percentage,
    lastOpenedAt: lastOpenedAt || new Date().toISOString(),
    toolsParts: toolsParts || repairDiagnosis?.tools || repairDiagnosis?.toolsNeeded || tools || [],
    completedParts,
  };
}

async function getListWithSeed(storageKey, seedItems) {
  const storedValue = await AsyncStorage.getItem(storageKey);
  if (!storedValue) {
    await AsyncStorage.setItem(storageKey, JSON.stringify(seedItems));
    return seedItems;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    if (Array.isArray(parsedValue)) return parsedValue;
  } catch (error) {
    // Fall back to seeds below.
  }

  await AsyncStorage.setItem(storageKey, JSON.stringify(seedItems));
  return seedItems;
}

async function saveList(storageKey, items) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(items));
  return items;
}

export async function getTools() {
  return getListWithSeed(TOOLS_STORAGE_KEY, DEFAULT_TOOLS);
}

export async function addTool(name, category = 'Hand Tools') {
  const tools = await getTools();
  const nextTool = { id: createId('tool'), name, owned: true, category };
  await saveList(TOOLS_STORAGE_KEY, [nextTool, ...tools]);
  return nextTool;
}

export async function addToolToInventory(name, category) {
  const normalizedName = name?.trim();
  if (!normalizedName) return null;

  const tools = await getTools();
  const existingTool = tools.find(
    (tool) => tool.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (existingTool) {
    const updatedTool = {
      ...existingTool,
      owned: true,
      ...(category ? { category } : {}),
    };
    await saveList(
      TOOLS_STORAGE_KEY,
      tools.map((tool) => (tool.id === existingTool.id ? updatedTool : tool))
    );
    return updatedTool;
  }

  const nextTool = { id: createId('tool'), name: normalizedName, owned: true, category: category || 'Hand Tools' };
  await saveList(TOOLS_STORAGE_KEY, [nextTool, ...tools]);
  return nextTool;
}

export async function updateTool(toolId, updates) {
  const tools = await getTools();
  const updatedTools = tools.map((tool) => (tool.id === toolId ? { ...tool, ...updates } : tool));
  await saveList(TOOLS_STORAGE_KEY, updatedTools);
  return updatedTools.find((tool) => tool.id === toolId) || null;
}

export async function deleteTool(toolId) {
  const tools = await getTools();
  const updatedTools = tools.filter((tool) => tool.id !== toolId);
  await saveList(TOOLS_STORAGE_KEY, updatedTools);
  return updatedTools;
}

export async function getShoppingItems() {
  const items = await getListWithSeed(SHOPPING_STORAGE_KEY, DEFAULT_SHOPPING_ITEMS);
  const dedupedItems = dedupeShoppingItems(items);

  if (dedupedItems.length !== items.length) {
    await saveList(SHOPPING_STORAGE_KEY, dedupedItems);
  }

  return dedupedItems;
}

export async function addShoppingItem(name, sourceRepair = 'Manual add', options = {}) {
  const normalizedName = name?.trim();
  if (!normalizedName) return null;

  const items = await getShoppingItems();
  const existingItem = items.find(
    (item) => normalizeListName(item.name) === normalizeListName(normalizedName)
  );

  if (existingItem) {
    const updatedItem = {
      ...existingItem,
      status: existingItem.status || options.status || 'needed',
      source: options.source === 'repair' ? 'repair' : existingItem.source || options.source || 'manual',
      repairId: existingItem.repairId || options.repairId,
      sourceRepair: mergeSourceRepair(existingItem.sourceRepair, sourceRepair),
    };
    await saveList(
      SHOPPING_STORAGE_KEY,
      items.map((item) => (item.id === existingItem.id ? updatedItem : item))
    );
    return updatedItem;
  }

  const nextItem = {
    id: createId('shop'),
    name: normalizedName,
    complete: false,
    status: options.status || 'needed',
    source: options.source || 'manual',
    repairId: options.repairId,
    sourceRepair,
  };
  await saveList(SHOPPING_STORAGE_KEY, [nextItem, ...items]);
  return nextItem;
}

export async function addShoppingItems(itemsToAdd, sourceRepair = 'Suggested repair', options = {}) {
  if (!itemsToAdd?.length) return getShoppingItems();

  const currentItems = await getShoppingItems();
  const normalizedItemsToAdd = itemsToAdd
    .map((name) => String(name || '').trim())
    .filter(Boolean);
  const incomingNames = new Set(normalizedItemsToAdd.map(normalizeListName));
  const existingNames = new Set(currentItems.map((item) => normalizeListName(item.name)));
  const updatedCurrentItems = currentItems.map((item) => {
    if (!incomingNames.has(normalizeListName(item.name))) return item;

    return {
      ...item,
      complete: false,
      status: options.status || item.status || 'needed',
      source: options.source === 'repair' ? 'repair' : item.source || options.source || 'manual',
      repairId: item.repairId || options.repairId,
      sourceRepair: mergeSourceRepair(item.sourceRepair, sourceRepair),
    };
  });
  const nextItems = itemsToAdd
    .map((name) => String(name || '').trim())
    .filter((name) => {
      const normalizedName = normalizeListName(name);
      if (!normalizedName || existingNames.has(normalizedName)) return false;
      existingNames.add(normalizedName);
      return true;
    })
    .map((name) => ({
      id: createId('shop'),
      name,
      complete: false,
      status: options.status || 'needed',
      source: options.source || 'manual',
      repairId: options.repairId,
      sourceRepair,
    }));

  if (!nextItems.length) return saveList(SHOPPING_STORAGE_KEY, updatedCurrentItems);

  return saveList(SHOPPING_STORAGE_KEY, [...nextItems, ...updatedCurrentItems]);
}

export async function updateShoppingItem(itemId, updates) {
  const items = await getShoppingItems();
  const updatedItems = items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
  await saveList(SHOPPING_STORAGE_KEY, updatedItems);
  return updatedItems.find((item) => item.id === itemId) || null;
}

export async function deleteShoppingItem(itemId) {
  const items = await getShoppingItems();
  const updatedItems = items.filter((item) => item.id !== itemId);
  await saveList(SHOPPING_STORAGE_KEY, updatedItems);
  return updatedItems;
}

export async function getRepairsTodo() {
  const repairs = await getListWithSeed(TODO_STORAGE_KEY, DEFAULT_TODO_REPAIRS);
  const normalizedRepairs = repairs.map((repair) => buildRepairTodo(repair));

  const needsMigration = JSON.stringify(normalizedRepairs) !== JSON.stringify(repairs);
  if (needsMigration) {
    await saveList(TODO_STORAGE_KEY, normalizedRepairs);
  }

  return normalizedRepairs;
}

export async function addRepairTodo(name) {
  const repairs = await getRepairsTodo();
  const nextRepair = buildRepairTodo({ name });
  await saveList(TODO_STORAGE_KEY, [nextRepair, ...repairs]);
  return nextRepair;
}

export async function saveRepairTodoProgress({
  repairId,
  name,
  label,
  categoryTitle,
  diagnosis,
  currentStepIndex = 0,
  totalSteps,
  completedParts = {},
  status = 'in_progress',
  toolsParts,
}) {
  const repairs = await getRepairsTodo();
  const normalizedName = (name || diagnosis?.issue || label || 'Saved repair').trim();
  const existingRepairIndex = repairId
    ? repairs.findIndex((repair) => repair.id === repairId)
    : repairs.findIndex(
        (repair) =>
          repair.label === label ||
          repair.name.toLowerCase() === normalizedName.toLowerCase() ||
          repair.diagnosis?.issue?.toLowerCase() === normalizedName.toLowerCase()
      );

  const nextRepair = buildRepairTodo({
    id: existingRepairIndex >= 0 ? repairs[existingRepairIndex].id : undefined,
    name: normalizedName,
    label,
    categoryTitle,
    diagnosis,
    currentStepIndex,
    totalSteps,
    completedParts,
    status,
    complete: status === 'completed',
    toolsParts,
    lastOpenedAt: new Date().toISOString(),
  });

  const updatedRepairs =
    existingRepairIndex >= 0
      ? repairs.map((repair, index) => (index === existingRepairIndex ? nextRepair : repair))
      : [nextRepair, ...repairs];

  await saveList(TODO_STORAGE_KEY, updatedRepairs);
  return nextRepair;
}

export async function completeRepairTodo(repairId) {
  if (!repairId) return null;

  const repairs = await getRepairsTodo();
  const repair = repairs.find((item) => item.id === repairId);
  if (!repair) return null;

  const completedRepair = buildRepairTodo({
    ...repair,
    complete: true,
    status: 'completed',
    currentStepIndex: Math.max(0, (repair.totalSteps || repair.diagnosis?.steps?.length || 1) - 1),
    progressPercentage: 100,
    lastOpenedAt: new Date().toISOString(),
  });

  await saveList(
    TODO_STORAGE_KEY,
    repairs.map((item) => (item.id === repairId ? completedRepair : item)),
  );
  return completedRepair;
}

export async function updateRepairTodo(repairId, updates) {
  const repairs = await getRepairsTodo();
  const updatedRepairs = repairs.map((repair) => (repair.id === repairId ? { ...repair, ...updates } : repair));
  await saveList(TODO_STORAGE_KEY, updatedRepairs);
  return updatedRepairs.find((repair) => repair.id === repairId) || null;
}

export async function deleteRepairTodo(repairId) {
  const repairs = await getRepairsTodo();
  const updatedRepairs = repairs.filter((repair) => repair.id !== repairId);
  await saveList(TODO_STORAGE_KEY, updatedRepairs);
  return updatedRepairs;
}
