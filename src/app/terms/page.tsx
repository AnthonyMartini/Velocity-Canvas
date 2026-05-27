import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — Velocity Canvas',
  description: 'Terms of Service and billing policy for Velocity Canvas.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00D1FF]/30">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-[#6f7a92] transition-colors hover:text-white mb-12"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        
        <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>
        
        <div className="space-y-8 text-[#b3bfd4] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Velocity Canvas ("we," "our," or "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>
              Velocity Canvas is an online platform that allows users to visual-design layout canvas grids and use AI to generate Power Apps YAML code configurations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p>
              To access full editor features, you must log in via Google Sign-In. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Credits, Billing, and Subscriptions</h2>
            <p>
              We run our platform on a credit-based system to cover the resource costs of AI model execution:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Free Tier:</strong> New users receive 25 complimentary, one-time credits upon first registration.</li>
              <li><strong>Pro Tier:</strong> For $10/month, you receive 500 credits per month. Pro subscriptions auto-renew monthly until cancelled.</li>
              <li><strong>Rollover Policy:</strong> Monthly credits allocated under the Pro plan do not roll over to subsequent months and expire at the end of each billing cycle.</li>
              <li><strong>Refunds:</strong> Since credits are consumed immediately to generate real-time AI responses, all payments are non-refundable.</li>
              <li><strong>Payment Processing:</strong> All transactions are securely processed by Stripe. We do not store credit card details on our servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Intellectual Property</h2>
            <p>
              You retain all ownership, intellectual property rights, and copyright to the generated Power Apps YAML code configurations created using our service. We own all rights, title, and interest in the Velocity Canvas software, templates, design components, and visual assets.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Acceptable Use</h2>
            <p>
              You agree not to attempt to breach our security, scrape our interface, automate requests beyond standard usage limits, or manipulate the credit system to bypass payment walls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
            <p>
              The service is provided "as-is" and "as-available" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Contact Us</h2>
            <p>
              If you have any questions or feedback regarding these Terms, please reach out to us via LinkedIn or our support form.
            </p>
          </section>

          <footer className="pt-12 text-sm text-[#6f7a92]">
            Last updated: May 27, 2026
          </footer>
        </div>
      </div>
    </div>
  );
}
