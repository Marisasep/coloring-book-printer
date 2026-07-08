const STORAGE_KEY = "lottery_used_numbers";
const MAX_TICKETS = 80;

export function getUsedNumbers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsedNumbers(numbers: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers));
}

export function generateUniqueNumber(): string | null {
  const used = new Set(getUsedNumbers());
  if (used.size >= MAX_TICKETS) return null;

  let candidate: string;
  do {
    candidate = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 10).toString()
    ).join("");
  } while (used.has(candidate));

  const arr = [...used, candidate];
  saveUsedNumbers(arr);
  return candidate;
}

export function getRemainingCount(): number {
  return MAX_TICKETS - getUsedNumbers().length;
}

export function resetNumbers(): void {
  localStorage.removeItem(STORAGE_KEY);
}
