import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(dateString) {
  if (!dateString) return "Just now";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffInSeconds) || diffInSeconds < 0) return "Just now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return "Just now";
  }
}

export function extractDurationInDays(text) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();

  // Pattern 1: numbers like "3 days", "for 5 days", "10 days", "1 day"
  const matchDays = lower.match(/(?:for\s+)?(\d+)\s*days?/);
  if (matchDays) {
    const days = parseInt(matchDays[1], 10);
    if (days > 0 && days <= 365) return days;
  }

  // Pattern 2: weeks like "for 1 week", "2 weeks"
  const matchWeeks = lower.match(/(?:for\s+)?(\d+)\s*weeks?/);
  if (matchWeeks) {
    const weeks = parseInt(matchWeeks[1], 10);
    if (weeks > 0 && weeks <= 52) return weeks * 7;
  }

  // Pattern 3: months like "for 1 month"
  const matchMonths = lower.match(/(?:for\s+)?(\d+)\s*months?/);
  if (matchMonths) {
    const months = parseInt(matchMonths[1], 10);
    if (months > 0 && months <= 12) return months * 30;
  }

  // Pattern 4: written words like "for three days", "one week", "five days"
  const wordMap = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, twenty: 20, thirty: 30
  };

  const wordDaysMatch = lower.match(/(?:for\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty)\s*days?/);
  if (wordDaysMatch && wordMap[wordDaysMatch[1]]) {
    return wordMap[wordDaysMatch[1]];
  }

  const wordWeeksMatch = lower.match(/(?:for\s+)?(one|two|three|four)\s*weeks?/);
  if (wordWeeksMatch && wordMap[wordWeeksMatch[1]]) {
    return wordMap[wordWeeksMatch[1]] * 7;
  }

  const wordMonthsMatch = lower.match(/(?:for\s+)?(one|two|three)\s*months?/);
  if (wordMonthsMatch && wordMap[wordMonthsMatch[1]]) {
    return wordMap[wordMonthsMatch[1]] * 30;
  }

  return null;
}
