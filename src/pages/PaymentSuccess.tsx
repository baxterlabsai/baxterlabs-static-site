import { Link } from 'react-router-dom'

export default function PaymentSuccess() {

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
      <div className="bg-white rounded-lg border border-gray-light max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal mb-3">Payment Received</h1>
        <p className="text-gray-warm mb-6">
          Thank you for your payment. A confirmation email will be sent to you shortly.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 transition-colors"
        >
          Return to BaxterLabs
        </Link>
      </div>
    </div>
  )
}
