/**
 * SENTINEL Time Utilities — IST (Asia/Kolkata, UTC+05:30) Formatter
 * 
 * Internal timestamps remain ISO 8601 UTC strings.
 * All user-facing displays convert strictly to Indian Standard Time (IST).
 */

export interface FormatISTOptions {
  seconds?: boolean;
  includeDate?: boolean;
  includeOffset?: boolean;
}

/**
 * Formats a Date, timestamp number, or ISO string into IST (Asia/Kolkata, UTC+05:30).
 * Output examples:
 *  - Time only: "14:32:07 IST" (or "14:32 IST" if seconds: false)
 *  - Date and time: "24 Oct 2026, 14:32:07 IST"
 *  - With offset: "14:32:07 IST (+05:30)"
 */
export function formatIST(
  dateInput?: string | number | Date | null,
  options: FormatISTOptions = { seconds: true }
): string {
  if (!dateInput) return '--:--:-- IST';

  let date: Date;
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    return '--:--:-- IST';
  }

  const { seconds = true, includeDate = false, includeOffset = false } = options;

  const timeFormatOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  if (seconds) {
    timeFormatOptions.second = '2-digit';
  }

  if (includeDate) {
    timeFormatOptions.day = '2-digit';
    timeFormatOptions.month = 'short';
    timeFormatOptions.year = 'numeric';
  }

  const formatter = new Intl.DateTimeFormat('en-IN', timeFormatOptions);
  const formatted = formatter.format(date);

  const offsetStr = includeOffset ? ' (+05:30)' : '';
  return `${formatted} IST${offsetStr}`;
}

/**
 * Returns the current live wall-clock time formatted in IST ticking format "HH:mm:ss IST".
 */
export function getLiveIST(): string {
  return formatIST(new Date(), { seconds: true });
}

/**
 * Formats ISO strings into human friendly IST for reports and exports.
 */
export function formatISTReport(dateInput?: string | number | Date | null): string {
  return formatIST(dateInput, { seconds: true, includeDate: true, includeOffset: true });
}
