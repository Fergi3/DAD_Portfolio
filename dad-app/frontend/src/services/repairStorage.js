import AsyncStorage from '@react-native-async-storage/async-storage';

const REPAIRS_STORAGE_KEY = 'dad_saved_repairs';

export async function getRepairs() {
  const storedValue = await AsyncStorage.getItem(REPAIRS_STORAGE_KEY);
  if (!storedValue) return [];

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
}

export async function saveRepair(repair) {
  const existingRepairs = await getRepairs();
  const nextRepair = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    issue: repair.issue,
    category: repair.category,
    date: repair.date,
    notes: repair.notes || '',
  };

  const updatedRepairs = [nextRepair, ...existingRepairs];
  await AsyncStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updatedRepairs));

  return nextRepair;
}

export async function updateRepair(repairId, updates) {
  const existingRepairs = await getRepairs();
  const updatedRepairs = existingRepairs.map((repair) =>
    repair.id === repairId ? { ...repair, ...updates } : repair
  );

  await AsyncStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updatedRepairs));
  return updatedRepairs.find((repair) => repair.id === repairId) || null;
}

export async function deleteRepair(repairId) {
  const existingRepairs = await getRepairs();
  const updatedRepairs = existingRepairs.filter((repair) => repair.id !== repairId);

  await AsyncStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updatedRepairs));
  return updatedRepairs;
}
