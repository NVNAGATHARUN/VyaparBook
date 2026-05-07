
import { formatAmount } from '../../utils/formatAmount';

/**
 * AmountCard — shows a label and amount with color coding
 * variant: 'danger' (red), 'success' (green), 'neutral' (gray), 'warning' (orange)
 */
const AmountCard = ({
  label,
  amount,
  subLabel,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      label: 'text-red-500',
      amount: 'text-red-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-100',
      label: 'text-green-600',
      amount: 'text-green-700',
    },
    neutral: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      label: 'text-gray-500',
      amount: 'text-gray-800',
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      label: 'text-orange-500',
      amount: 'text-orange-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      label: 'text-blue-500',
      amount: 'text-blue-700',
    },
  };

  const sizeStyles = {
    sm: { label: 'text-xs', amount: 'text-lg font-bold', padding: 'p-3' },
    md: { label: 'text-sm', amount: 'text-2xl font-bold', padding: 'p-4' },
    lg: { label: 'text-base', amount: 'text-3xl font-bold', padding: 'p-5' },
  };

  const v = variantStyles[variant] || variantStyles.neutral;
  const s = sizeStyles[size] || sizeStyles.md;

  return (
    <div
      className={`${v.bg} border ${v.border} rounded-2xl ${s.padding} ${className}`}
    >
      <p className={`${v.label} ${s.label} font-medium mb-1`}>{label}</p>
      <p className={`${v.amount} ${s.amount} font-mono-amount`}>
        {formatAmount(amount)}
      </p>
      {subLabel && (
        <p className="text-gray-400 text-xs mt-1">{subLabel}</p>
      )}
    </div>
  );
};

export default AmountCard;
