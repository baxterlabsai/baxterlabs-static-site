import { Link } from 'react-router-dom'

export default function PaymentCancelled() {

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
      <div className="bg-white rounded-lg border border-gray-light max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal mb-3">Payment Cancelled</h1>
        <p className="text-gray-warm mb-6">
          Your payment was not completed. If you'd like to try again, please use the payment link from your invoice email.
        </p>
        <p className="text-gray-warm text-sm mb-6">
          Questions? Contact us at <a href="mailto:info@baxterlabs.ai" className="text-teal hover:underline">info@baxterlabs.ai</a>
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
