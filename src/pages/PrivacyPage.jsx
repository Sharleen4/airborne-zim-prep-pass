import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-jakarta pb-12">
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10">
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-white/70 text-sm mt-1">Last updated: April 22, 2026</p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto text-sm leading-relaxed bg-background text-gray-900 dark:text-gray-100">

        <Section title="1. Introduction">
          Zama Ai Primary ("we", "our", or "us") is committed to protecting the privacy of our users, especially children. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Zama Ai Primary educational platform. Please read this policy carefully. If you do not agree with its terms, please discontinue use of the App.
        </Section>

        <Section title="2. Information We Collect">
          <strong className="text-foreground">Information you provide directly:</strong>
          <ul className="list-disc ml-5 space-y-1 mt-2 mb-3">
            <li>Full name and email address (at registration)</li>
            <li>Payment information (processed by Paynow; we do not store card details)</li>
            <li>Bookmarks, notes, and user-generated content within the App</li>
          </ul>
          <strong className="text-foreground">Information collected automatically:</strong>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>Practice session results and scores</li>
            <li>Topic progress and study activity</li>
            <li>Device type and browser information</li>
            <li>App usage patterns (e.g. pages visited, features used)</li>
          </ul>
        </Section>

        <Section title="3. Children's Privacy">
          We are committed to complying with applicable children's privacy laws. The App is designed for students aged 9–13. We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you are a parent or guardian and believe your child has provided us with personal information without consent, please contact us immediately at support@zamaai.com and we will delete that information promptly.
        </Section>

        <Section title="4. How We Use Your Information">
          We use the information we collect to:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>Provide, operate, and improve the App and its features</li>
            <li>Personalise your learning experience and track academic progress</li>
            <li>Process payments and manage your subscription</li>
            <li>Send important account notifications and updates</li>
            <li>Analyse usage trends to improve educational content</li>
            <li>Comply with legal obligations</li>
            <li>Respond to support requests and enquiries</li>
          </ul>
          We do <strong>not</strong> sell your personal data to third parties. We do <strong>not</strong> use your data for advertising purposes.
        </Section>

        <Section title="5. Legal Basis for Processing (GDPR)">
          Where applicable, we process your personal data on the following legal bases:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Contract:</strong> Processing necessary to provide the service you have subscribed to.</li>
            <li><strong className="text-foreground">Legitimate interests:</strong> Improving the App and ensuring security.</li>
            <li><strong className="text-foreground">Consent:</strong> Where you have explicitly provided consent (e.g. parental consent for minors).</li>
            <li><strong className="text-foreground">Legal obligation:</strong> Where required by applicable law.</li>
          </ul>
        </Section>

        <Section title="6. Data Sharing and Disclosure">
          We do not sell, trade, or rent your personal information. We may share your information only in the following circumstances:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Service providers:</strong> Third-party vendors who assist in operating the App (e.g. cloud hosting, payment processing via Paynow, AI providers). These parties are bound by confidentiality obligations.</li>
            <li><strong className="text-foreground">Legal requirements:</strong> If required by law, court order, or governmental authority.</li>
            <li><strong className="text-foreground">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of that transaction.</li>
          </ul>
        </Section>

        <Section title="7. Data Retention">
          We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time via the Profile page or by contacting us. We will delete your data within 30 days of a valid request, except where retention is required by law.
        </Section>

        <Section title="8. Data Security">
          We implement industry-standard security measures to protect your personal information, including:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure authentication and session management</li>
            <li>Access controls limiting who can view personal data</li>
            <li>Regular security reviews</li>
          </ul>
          However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
        </Section>

        <Section title="9. Cookies and Tracking">
          The App uses essential cookies and local storage to maintain your session and remember your preferences (e.g. theme settings, offline cache). We do not use cookies for advertising or cross-site tracking. You can clear cookies through your browser settings, though this may affect App functionality.
        </Section>

        <Section title="10. Your Rights">
          Depending on your jurisdiction, you may have the following rights regarding your personal data:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong className="text-foreground">Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong className="text-foreground">Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
            <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format.</li>
            <li><strong className="text-foreground">Objection:</strong> Object to certain types of processing.</li>
            <li><strong className="text-foreground">Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
          </ul>
          To exercise any of these rights, please contact us at support@zamaai.com.
        </Section>

        <Section title="11. Third-Party Services">
          The App integrates with the following third-party services:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Paynow Zimbabwe:</strong> For payment processing. Subject to Paynow's own privacy policy.</li>
            <li><strong className="text-foreground">AI providers:</strong> For generating educational content. Prompts may include topic names but not personal student data.</li>
            <li><strong className="text-foreground">Cloud infrastructure:</strong> For secure data hosting.</li>
          </ul>
          We encourage you to review the privacy policies of these third-party services.
        </Section>

        <Section title="12. International Data Transfers">
          Your information may be processed and stored on servers located outside of Zimbabwe. We ensure that any such transfers comply with applicable data protection laws and that appropriate safeguards are in place.
        </Section>

        <Section title="13. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant changes via the App or by email. The "Last updated" date at the top of this page indicates when the policy was last revised. Your continued use of the App after changes are posted constitutes your acceptance of the revised policy.
        </Section>

        <Section title="14. Contact Us">
          If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          <br /><br />
          <strong>Zama Ai Primary Educational Platform</strong><br />
          Email: support@zamaaiprimary.online<br />
          Location: Zimbabwe<br /><br />
          We will respond to all legitimate requests within 30 days.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-bold text-base text-gray-900 dark:text-white mb-2">{title}</h2>
      <div className="text-gray-800 dark:text-gray-100">{children}</div>
    </div>
  );
}