import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-lg text-center">
        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-foreground mb-6 tracking-tight">
          Wheel of Aliveness
        </h1>

        {/* Quote */}
        <p className="font-serif text-lg text-foreground-muted italic mb-10 leading-relaxed">
          &ldquo;Until you make the unconscious conscious, it will direct your
          life and you will call it fate.&rdquo;
          <span className="block text-sm mt-2 not-italic">— Carl Jung</span>
        </p>

        {/* Description */}
        <p className="font-sans text-base text-foreground leading-relaxed mb-3">
          This is not an assessment tool. It&apos;s a practice in honesty.
        </p>
        <p className="font-sans text-sm text-foreground-muted leading-relaxed mb-10">
          You&apos;ll be guided through eight dimensions of your life — not to
          analyze, but to feel into where things are flowing and where they feel
          heavier. An AI companion will walk alongside you, asking the kind of
          questions a wise friend would ask.
        </p>

        {/* CTA */}
        <Link
          href="/journey"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-sans text-base font-medium text-white bg-primary hover:bg-primary-hover transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          Begin Your Journey
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>

        {/* Meta info */}
        <p className="mt-6 font-sans text-xs text-foreground-muted">
          About 30 minutes &middot; 8 dimensions &middot; Deeply personal
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center">
        <p className="font-sans text-xs text-foreground-muted opacity-60">
          The Argonauts &middot; Explorer Membership
        </p>
      </footer>
    </main>
  );
}
