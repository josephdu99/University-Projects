export const metadata = { title: "Terms of Service — StepUp" };

const UPDATED = "23 July 2026";

export default function TermsPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">Terms of Service</h1>
      <p className="text-xs">Last updated: {UPDATED}</p>

      <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-ink">
        <strong>Template — needs legal review before launch.</strong> This is a
        reasonable starting point drafted for an Australian marketplace, not
        legal advice. Have a lawyer review it and fill in the operator details
        below before taking real payments.
      </div>

      <h2 className="mt-4 text-lg font-bold text-ink">1. Who we are</h2>
      <p>
        StepUp (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a platform that
        connects people who want to take dance classes with studios and
        independent instructors who run them.{" "}
        <em>[Operator legal entity name, ABN and registered address]</em>
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">2. Your account</h2>
      <p>
        You must be at least 16 years old to create an account, provide accurate
        information, and keep your password secure. You&apos;re responsible for
        activity under your account. Tell us promptly if you suspect
        unauthorised access.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">3. We are a marketplace</h2>
      <p>
        Classes are provided by independent studios and instructors, not by us.
        We don&apos;t employ them, supervise their teaching, or control the
        premises where in-person classes happen. Your agreement to attend a
        class is with the host. We&apos;re responsible for running the platform;
        the host is responsible for the class.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">4. Bookings and payments</h2>
      <p>
        Paid classes are processed by Stripe. Funds are paid to the host&apos;s
        connected Stripe account, and we retain a platform fee disclosed at
        checkout. We don&apos;t store your card details.
      </p>
      <p>
        If you cancel before a class starts, any payment is refunded in full. If
        a host cancels a class, everyone booked is refunded automatically. After
        a class has started, refunds are at the host&apos;s discretion.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">5. Hosts</h2>
      <p>
        If you list classes, you confirm you have the right to run them, hold
        any insurance and qualifications required in your jurisdiction, and will
        honour bookings made through the platform. You&apos;re responsible for
        the accuracy of your listings and for the safety of your classes. You
        must complete Stripe onboarding before charging for classes.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">6. Points, badges and leaderboards</h2>
      <p>
        Points, streaks, levels and badges are a free feature with no monetary
        value. They can&apos;t be exchanged, transferred or redeemed. We may
        adjust or reset them where we detect misuse — for example, claiming
        attendance for classes you didn&apos;t attend.
      </p>
      <p className="mt-2">
        The leaderboard is separate and opt-in: you only appear on it if you
        turn it on in your profile, it ranks dancers on classes attended in the
        current month and nothing else, and it resets on the first of each
        month.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">7. Acceptable use</h2>
      <p>
        Don&apos;t use StepUp to harass others, post misleading listings,
        attempt to gain unauthorised access, scrape the platform, or break the
        law. We may suspend accounts that do.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">8. Australian Consumer Law</h2>
      <p>
        Nothing in these terms excludes, restricts or modifies any guarantee,
        right or remedy you have under the Australian Consumer Law that
        can&apos;t lawfully be excluded. Where we&apos;re permitted to limit our
        liability, we limit it to resupplying the service or paying the cost of
        resupply.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">9. Changes and termination</h2>
      <p>
        We may update these terms; material changes will be notified in the app
        or by email. You can close your account at any time. We may suspend or
        close accounts that breach these terms.
      </p>

      <h2 className="mt-4 text-lg font-bold text-ink">10. Contact</h2>
      <p>
        Questions about these terms: <em>[support email address]</em>
      </p>
    </>
  );
}
