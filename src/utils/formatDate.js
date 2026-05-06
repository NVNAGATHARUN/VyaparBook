/**
 * Format date in Indian DD/MM/YYYY format
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format date with month name
 */
export const formatDateLong = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Get today's date in YYYY-MM-DD for input[type=date]
 */
export const todayISO = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Relative time (Today, Yesterday, or date)
 */
export const formatRelative = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDateLong(date);
};
