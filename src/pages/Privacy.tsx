import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";

const Privacy = () => {
  const updated = "May 5, 2026";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Privacy Policy — Cash Stage"
        description="How Cash Stage collects, uses, and protects your data. Account info, audio uploads, payments, and your rights."
        path="/privacy"
      />
      <SiteNav />
      <main className="container max-w-3xl pt-28 pb-20">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
          Privacy <span className="text-gradient-primary">Policy</span>
        </h1>
        <p className="text-muted-foreground mb-10">Last updated: {updated}</p>

        <section className="space-y-8 text-sm md:text-base leading-relaxed">
          <div>
            <h2 className="font-display text-2xl mb-2">1. Who we are</h2>
            <p>
              Cash Stage ("we", "us", "the app") is operated by Miss Bama Slammer.
              Contact: <a className="underline" href="mailto:privacy@cashstage.app">privacy@cashstage.app</a>.
              This policy explains what we collect when you use the Cash Stage mobile and web app, and how we use it.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">2. Information we collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data.</strong> Email address, display name, and authentication identifiers
                you create when signing up or signing in (including via Google).
              </li>
              <li>
                <strong>Microphone audio.</strong> When you use the Studio to record a drop, the app
                captures audio from your device microphone. Recording only starts after you tap record
                and grant the OS permission. We never record in the background.
              </li>
              <li>
                <strong>User content.</strong> Recordings, track titles, captions, votes, and any other
                content you choose to upload or publish.
              </li>
              <li>
                <strong>Usage & device analytics.</strong> Pages viewed, features used, approximate
                session length, device model, OS version, app version, crash logs, and a randomly
                generated install ID. We do not collect precise location or contacts.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">3. How we use your data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide the core features (recording, publishing, voting, wallet).</li>
              <li>To authenticate you and keep your account secure.</li>
              <li>To improve performance, fix bugs, and understand which features get used.</li>
              <li>To comply with legal obligations and enforce our terms.</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> sell your personal data. We do not use your recordings to
              train third-party AI models.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">4. Microphone permission</h2>
            <p>
              Cash Stage requests <code>RECORD_AUDIO</code> on Android only so the Studio can capture
              your performance. You can revoke this at any time in your device's
              <em> Settings → Apps → Cash Stage → Permissions</em>. Without it, the Studio recording
              feature will not work, but the rest of the app remains usable.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">5. How we share data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Backend hosting:</strong> Lovable Cloud (database, auth, file storage).</li>
              <li><strong>Authentication:</strong> Google Sign-In, when you choose it.</li>
              <li><strong>Public content:</strong> Tracks you publish to the feed are visible to other users.</li>
              <li><strong>Legal:</strong> When required by law or to protect rights and safety.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">6. Data retention</h2>
            <p>
              We keep account data for as long as your account is active. You can delete your account
              and associated content at any time by emailing
              <a className="underline ml-1" href="mailto:privacy@cashstage.app">privacy@cashstage.app</a>.
              Backups are purged within 30 days of deletion.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">7. Your rights</h2>
            <p>
              Depending on where you live (GDPR, CCPA, etc.) you can request access, correction,
              export, or deletion of your data. Contact us at the address above and we will respond
              within 30 days.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">8. Children</h2>
            <p>
              Cash Stage is not directed to children under 13. We do not knowingly collect data from
              children under 13. If you believe a child has provided us data, contact us and we will
              delete it.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">9. Security</h2>
            <p>
              Data is transmitted over HTTPS and stored with row-level security. No system is
              perfectly secure; we encourage you to use a strong, unique password.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">10. Google Play Data Safety</h2>
            <p className="mb-2">For our Google Play listing, we declare the following:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Data collected:</strong> email, name, user-generated audio, in-app actions (plays, votes, scores), purchase history, approximate location (from IP only).</li>
              <li><strong>Data shared with third parties:</strong> none, except payment processors (Google Play Billing) and AdMob (only for free-tier users, anonymized device ID for ad personalization).</li>
              <li><strong>Encryption in transit:</strong> yes (HTTPS / TLS).</li>
              <li><strong>Data deletion:</strong> users can delete their account and all associated data by emailing <a className="underline" href="mailto:privacy@cashstage.app">privacy@cashstage.app</a>.</li>
              <li><strong>Children:</strong> the app is rated 13+. We do not knowingly collect data from children under 13.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">11. User-generated content & moderation</h2>
            <p>
              All audio is recorded or uploaded by users. We provide an in-app report button on every track.
              Reports are reviewed by our moderation team within 24 hours and offending content is hidden or removed.
              Content that infringes copyright, depicts minors sexually, contains hate speech, or is AI-generated is prohibited.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl mb-2">12. Changes</h2>
            <p>
              If we update this policy we will revise the "Last updated" date and, for material
              changes, notify you in-app.
            </p>
          </div>

          <div className="pt-6 border-t border-border/60">
            <Link to="/" className="underline text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
