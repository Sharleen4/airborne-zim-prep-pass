import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-jakarta pb-12">
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10">
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Terms and Conditions</h1>
        <p className="text-white/70 text-sm mt-1">Last updated: April 22, 2026</p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto text-sm text-foreground leading-relaxed">

        <Section title="1. Acceptance of Terms">
          By accessing or using Zama Ai Primary ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App. These terms apply to all users, including students, parents, and administrators.
        </Section>

        <Section title="2. Description of Service">
          Zama Ai Primary is an educational platform designed to help Grade 4–7 students in Zimbabwe prepare for ZIMSEC examinations. The App provides AI-generated notes, practice questions, mock exams, and progress tracking features.
        </Section>

        <Section title="3. Eligibility">
          The App is intended for use by students aged 9–13 and their parents or guardians. Users under the age of 13 must have parental or guardian consent to use the App. By registering, you confirm that you meet these eligibility requirements or have obtained the necessary consent.
        </Section>

        <Section title="4. User Accounts">
          <ul className="list-disc ml-5 space-y-1">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must provide accurate and complete information when registering.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must notify us immediately of any unauthorised use of your account.</li>
          </ul>
        </Section>

        <Section title="5. Subscriptions and Payments">
          <ul className="list-disc ml-5 space-y-1">
            <li>New users receive a 30-day free trial with full access to all features.</li>
            <li>After the trial, continued access requires a paid subscription (3-month or annual plan).</li>
            <li>Payments are processed securely via Paynow Zimbabwe.</li>
            <li>Subscription fees are non-refundable except where required by applicable law.</li>
            <li>We reserve the right to modify pricing with reasonable prior notice.</li>
          </ul>
        </Section>

        <Section title="6. Acceptable Use">
          You agree not to:
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>Use the App for any unlawful purpose or in violation of any regulations.</li>
            <li>Reproduce, distribute, or commercially exploit any content from the App without permission.</li>
            <li>Attempt to gain unauthorised access to any part of the App or its infrastructure.</li>
            <li>Upload or transmit viruses, malware, or any other malicious code.</li>
            <li>Harass, abuse, or harm other users.</li>
            <li>Use automated bots or scrapers to access the App.</li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          All content within the App, including but not limited to text, graphics, AI-generated notes, questions, and software, is the property of Zama Ai Primary or its licensors and is protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to use the App for personal educational purposes only.
        </Section>

        <Section title="8. AI-Generated Content">
          The App uses artificial intelligence to generate educational notes and questions. While we strive for accuracy, AI-generated content may occasionally contain errors. We do not guarantee the completeness or accuracy of AI-generated content and recommend cross-referencing with official ZIMSEC materials.
        </Section>

        <Section title="9. Disclaimer of Warranties">
          The App is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of the App. We do not guarantee that the App will be uninterrupted, error-free, or free of viruses or other harmful components.
        </Section>

        <Section title="10. Limitation of Liability">
          To the fullest extent permitted by law, Zama Ai Primary and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the App. Our total liability to you for any claim arising out of or relating to these terms or the App shall not exceed the amount you paid us in the 12 months preceding the claim.
        </Section>

        <Section title="11. Privacy">
          Your use of the App is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices.
        </Section>

        <Section title="12. Changes to Terms">
          We reserve the right to modify these Terms at any time. We will notify users of significant changes via the App or email. Your continued use of the App after changes are posted constitutes your acceptance of the revised Terms.
        </Section>

        <Section title="13. Termination">
          We reserve the right to suspend or terminate your account at our discretion if you violate these Terms, without prior notice. You may also delete your account at any time from the Profile page.
        </Section>

        <Section title="14. Governing Law">
          These Terms shall be governed by and construed in accordance with the laws of Zimbabwe. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Zimbabwe.
        </Section>

        <Section title="15. Contact Us">
          If you have any questions about these Terms, please contact us at:
          <br /><br />
          <strong>Zama Ai Primary Educational Platform</strong><br />
          Email: support@zamaaiprimary.online<br />
          Location: Zimbabwe
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