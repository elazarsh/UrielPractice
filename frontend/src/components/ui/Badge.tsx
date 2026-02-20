interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-gray-100 text-gray-700',
  red:     'bg-red-100 text-red-800',
  yellow:  'bg-yellow-100 text-yellow-800',
  green:   'bg-green-100 text-green-800',
  blue:    'bg-blue-100 text-blue-800',
  purple:  'bg-purple-100 text-purple-800',
  gray:    'bg-gray-100 text-gray-600',
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
      {children}
    </span>
  )
}
