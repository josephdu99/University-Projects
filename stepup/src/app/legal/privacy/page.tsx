export const metadata = { title: "Privacy Policy, StepUp" };

const UPDATED = "23 July 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="text-xs">Last updated: {UPDATED}</p>

      <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-ink">
        <strong>Template, needs legal review before launch.</strong> Drafted
        against the Australian Privacy Principles, but not legal advice. Have a
        lawyer review it and fill in the operator details before collecting real
        user data.
      </div>

      <h2 className="mt-4 text-lg font-bold text-ink">What we collect</h2>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>Account details</strong>, your name, email address, city,
          timezone, chosen avatar, and a securely hashed password. We never
          store your password in readable form.
        </li>
        <li>
          <strong>Activity</strong>, classes you book, attendance, points,
          streaks and badges.
        </li>
        <li>
          <strong>Host details</strong>, if you list classes, your studio name,
          address and class listings.
        </li>
        <li>
          <strong>Security data</strong>, sign-in attempts, and a hashed
          (non-reversible) form of your IP address, used to block brute-force
          attacks.
        </li>
      </ul>

      <h2 className="mt-4 text-lg font-bold text-ink">What we don&apos;t collect</h2>
      <p>
        We never see or store your card details. Payments are handled entirely
        by Stripe, which acts as an independent controller of that data under
        its own privacy policy.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">How we use it</h2>
      <p>
        To run your account, show you relevant classes, process bookings and
        payments, calculate your points and badges, send transactional email
        (confirmations, cancellations, password resets), and keep the platform
        secure. We don&apos;t sell your personal information.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">Who we share it with</h2>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>Hosts</strong>, when you book a class, the host sees your
          name and avatar on their roster so they can check you in.
        </li>
        <li>
          <strong>Other dancers</strong>, only if you turn on leaderboard
          visibility in your profile. Then your name, initials, city and the
          number of classes you attended this month appear on the monthly
          leaderboard. It is off by default and you can turn it off again at
          any time.
        </li>
        <li>
          <strong>Service providers</strong>, Stripe (payments), our email
          provider (transactional email), and our hosting and database
          providers.
        </li>
      </ul>

      <h2 className="mt-4 text-lg font-bold text-ink">Where it&apos;s stored</h2>
      <p>
        On servers operated by our hosting and database providers, which may be
        located outside Australia. We take reasonable steps to ensure overseas
        recipients handle your information consistently with the Australian
        Privacy Principles.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">How long we keep it</h2>
      <p>
        For as long as your account is open. If you close your account we delete
        or de-identify your personal information, except where we&apos;re
        required to keep transaction records (typically 7 years for tax
        purposes).
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">Your rights</h2>
      <p>
        You can access and correct most of your information directly in your
        profile. You can request a copy of your data, ask us to correct or
        delete it, or complain about how we&apos;ve handled it by contacting us.
        If you&apos;re not satisfied with our response, you can complain to the
        Office of the Australian Information Commissioner (oaic.gov.au).
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">Cookies</h2>
      <p>
        We use a single essential cookie to keep you signed in. We don&apos;t
        use advertising or third-party tracking cookies.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">Contact</h2>
      <p>
        Privacy questions or requests: <em>[privacy contact email]</em>
      </p>
    </>
  );
}
