import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
        
        <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-[#b3bfd4] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Velocity Canvas ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by Velocity Canvas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us, such as when you create an account via Google Sign-In, contact us for support, or participate in our early access programs. This may include:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Name and email address (via Google)</li>
              <li>Usage data and project metadata</li>
              <li>Feedback and communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide, maintain, and improve our services.</li>
              <li>Authenticate your account and manage access.</li>
              <li>Communicate with you about updates and new features.</li>
              <li>Protect the security and integrity of our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Data Security</h2>
            <p>
              We use Firebase (a Google platform) to securely store and authenticate your data. We take reasonable measures to protect your personal information from loss, theft, and unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us via LinkedIn or our support channels.
            </p>
          </section>

          <footer className="pt-12 text-sm text-[#6f7a92]">
            Last updated: May 4, 2026
          </footer>
        </div>
      </div>
    </div>
  );
}
