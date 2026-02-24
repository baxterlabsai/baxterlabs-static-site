import { validatePassword } from '../utils/passwordValidation'

interface PasswordRequirementsProps {
  password: string
}

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = validatePassword(password)

  return (
    <div className="bg-ivory border border-gray-light rounded-lg p-4">
      <p className="text-xs font-bold text-charcoal mb-2">Password Requirements:</p>
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={`flex items-center gap-1.5 text-xs transition-all duration-200 ${
              req.met
                ? 'text-teal line-through opacity-60'
                : 'text-charcoal/50'
            }`}
          >
            <span className="flex-shrink-0 w-4 text-center">
              {req.met ? (
                <span className="text-teal font-bold">{'\u2713'}</span>
              ) : (
                <span>{'\u25CB'}</span>
              )}
            </span>
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
