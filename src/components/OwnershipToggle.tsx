import { usePartnerProfiles } from '../hooks/usePartnerProfiles'

interface OwnershipToggleProps {
  value: 'mine' | 'all'
  onChange: (value: 'mine' | 'all') => void
  currentUserAuthId: string
  className?: string
}

export function OwnershipToggle({ value, onChange, currentUserAuthId, className = '' }: OwnershipToggleProps) {
  const { getColorByAuthUserId } = usePartnerProfiles()
  const partnerColor = getColorByAuthUserId(currentUserAuthId)

  return (
    <div role="group" aria-label="Ownership filter" className={`flex rounded-lg border border-gray-light overflow-hidden ${className}`}>
      <button
        type="button"
        aria-pressed={value === 'mine'}
        onClick={() => onChange('mine')}
        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${value !== 'mine' ? 'bg-white text-charcoal hover:bg-gray-50' : ''}`}
        style={value === 'mine' ? { backgroundColor: partnerColor, color: '#FFFFFF' } : undefined}
      >
        Mine
      </button>
      <button
        type="button"
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${value === 'all' ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-gray-50'}`}
      >
        All
      </button>
    </div>
  )
}
