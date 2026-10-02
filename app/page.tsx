import Reading from "./Reading";
import s from "./page.module.css";
import {
  assertSampleCitations,
  cleanSample,
  cleanTitle,
  clauseText,
  sampleFlags,
  sampleTitle,
} from "@/lib/sample";
import type { SampleFlag } from "@/lib/sample";

const SAMPLE_NOTE = "A made-up contract, with flags written by hand to show the format.";
const CLEAN_NOTE = "A made-up contract, shown as Redline would show a clean result.";
const SUMMARY_SAMPLE =
  "Halden & Rowe are hiring you to design a logo, brand guidelines and launch assets, for the fees in Schedule A, and will pay each invoice within 30 days of receiving it. They also get everything you make while the agreement runs. For two years after it ends you can't design for their competitors, and any dispute goes to arbitration in a place they choose.";

export default function Home() {
  assertSampleCitations();

  const [first, second, third] = sampleFlags;

  return (
    <div className={s.cloth}>
      <header className={s.band}>
        <a href="/" className={s.wordmark}>
          Redline
        </a>
        <a href="/sign-in" className={s.signIn}>
          Sign in
        </a>
      </header>

      <main>
        <article className={s.leaf} aria-labelledby="promise">
          <RunningHead />

          <h1 id="promise" className={s.promise}>
            Redline reads your contract and quotes back the sentences that reach too far.
          </h1>

          <div className={`${s.cols} ${s.excerpt}`}>
            <span className={`${s.num} ${s.heroExtra}`}>2.2</span>
            <p className={`${s.clause} ${s.heroExtra}`}>{clauseText("2.2")}</p>

            <span className={`${s.num} ${s.numDisplay}`}>{first.clause}</span>
            <p className={s.displayClause}>
              <span className={s.bracketLive} aria-hidden="true">
                [
              </span>
              {first.quote}
              <span className={s.bracketLive} aria-hidden="true">
                ]
              </span>
            </p>
            <HeroGloss flag={first} active />

            <span className={`${s.num} ${s.heroExtra}`}>{second.clause}</span>
            <p className={`${s.clause} ${s.heroExtra}`}>{second.quote}</p>
            <HeroGloss flag={second} extra />

            <span className={`${s.num} ${s.heroExtra}`}>{third.clause}</span>
            <p className={`${s.clause} ${s.heroExtra}`}>{third.quote}</p>
            <HeroGloss flag={third} extra />
          </div>

          <div className={s.apparatus}>
            <a href="/sign-up" className={s.action}>
              Try it on your contract
            </a>
            <p className={s.actionNote}>
              Free while Redline is in early access. Paste the text or upload a PDF with selectable
              text. Freelance agreements and general contracts only.
            </p>
          </div>
          <Folio n={1} />
        </article>

        <Reading runningHead={<RunningHead />} folio={<Folio n={2} />} />

        <article className={s.leaf} aria-labelledby="clean">
          <RunningHead title={cleanTitle} note={CLEAN_NOTE} />
          <div className={s.cols}>
            <div className={s.textCol}>
              <h2 id="clean" className={s.heading}>
                Sometimes there&rsquo;s nothing to flag
              </h2>
              <p className={s.lede}>
                If Redline finds nothing that reaches past the job, it says so and leaves the margin
                empty. It never adds a flag to look busy.
              </p>
            </div>
          </div>

          <div className={`${s.cols} ${s.cleanSample}`}>
            {cleanSample.map((clause) => (
              <ClauseRow key={clause.number} number={clause.number} text={clause.text} />
            ))}
            <p className={s.emptyMargin}>No flags. Redline found nothing here that reaches past the job.</p>
          </div>

          <p className={s.footnote}>
            Clean means Redline found nothing that reaches past the deal. It isn&rsquo;t a promise
            the contract is fair, or that you should sign it.
          </p>
          <Folio n={3} />
        </article>

        <article className={s.leaf} aria-labelledby="also">
          <div className={s.cols}>
            <h2 id="also" className={`${s.heading} ${s.textCol}`}>
              Also in every reading
            </h2>
          </div>

          <dl className={s.also}>
            <div className={s.alsoItem}>
              <dt className={s.subheading}>A plain summary</dt>
              <dd>
                <p>A short summary of what you&rsquo;re agreeing to, before the flags.</p>
                <p className={s.specimen}>{SUMMARY_SAMPLE}</p>
              </dd>
            </div>

            <div className={s.alsoItem}>
              <dt className={s.subheading}>Questions, answered from your contract</dt>
              <dd>
                <p>
                  Ask about anything in it. If the contract doesn&rsquo;t say, Redline tells you
                  that instead of guessing.
                </p>
                <div className={s.exchange}>
                  <p className={s.q}>When do I get paid?</p>
                  <p className={s.a}>
                    Within 30 days of receiving each invoice. <span className={s.ref}>Clause 2.2</span>
                  </p>
                  <p className={s.q}>Can I show this work in my portfolio?</p>
                  <p className={s.a}>The agreement doesn&rsquo;t say.</p>
                </div>
              </dd>
            </div>

            <div className={s.alsoItem}>
              <dt className={s.subheading}>Your own red lines</dt>
              <dd>
                <p>
                  Add the things you won&rsquo;t accept, like payment terms over 14 days. They can
                  add flags, but they never hide one Redline would have raised anyway.
                </p>
                <div className={s.exchange}>
                  <p className={s.q}>Your red line: payment terms longer than 14 days</p>
                  <p className={s.a}>
                    Adds a flag to clause 2.2: &ldquo;{clauseText("2.2")}&rdquo;
                  </p>
                </div>
              </dd>
            </div>

            <div className={s.alsoItem}>
              <dt className={s.subheading}>A library of past contracts</dt>
              <dd>
                Every reading is saved to your account, so you can come back to it. Delete any of
                them whenever you want.
              </dd>
            </div>
          </dl>
          <Folio n={4} />
        </article>

        <article className={s.leaf} aria-labelledby="wont">
          <div className={s.cols}>
            <div className={s.textCol}>
              <h2 id="wont" className={s.heading}>
                What Redline won&rsquo;t do
              </h2>
              <ul className={s.limits}>
                <li>
                  <p className={s.limitHead}>Tell you whether to sign.</p>
                  <p>That&rsquo;s your call. Redline shows you the sentences to decide on.</p>
                </li>
                <li>
                  <p className={s.limitHead}>Give legal advice.</p>
                  <p>Redline isn&rsquo;t a lawyer.</p>
                </li>
                <li>
                  <p className={s.limitHead}>Read scans or photos.</p>
                  <p>
                    It needs a PDF with selectable text, or pasted text, so every quote matches your
                    contract word for word.
                  </p>
                </li>
                <li>
                  <p className={s.limitHead}>Check leases or terms of service.</p>
                  <p>For now it reads freelance agreements and general contracts only.</p>
                </li>
              </ul>

              <h3 className={s.subheading}>Where your contract goes</h3>
              <p className={s.privacy}>
                Your file is read in your browser and never uploaded. Redline keeps the text so you
                can come back to it, until you delete it. To read it, Redline sends the text to an
                AI model, using only providers that don&rsquo;t keep it or train on it.
              </p>
            </div>
          </div>
          <Folio n={5} />
        </article>
      </main>

      <section className={s.close} aria-labelledby="close">
        <h2 id="close" className={s.closeHeading}>
          Read yours before you sign it.
        </h2>
        <a href="/sign-up" className={`${s.action} ${s.actionOnCloth}`}>
          Try it on your contract
        </a>
        <p className={s.closeNote}>Free while Redline is in early access.</p>
      </section>

      <footer className={s.colophon}>
        <p>Redline isn&rsquo;t a lawyer, and nothing here is legal advice.</p>
        <a href="/sign-in" className={s.signIn}>
          Sign in
        </a>
      </footer>
    </div>
  );
}

function RunningHead({ title = sampleTitle, note = SAMPLE_NOTE }: { title?: string; note?: string }) {
  return (
    <div className={s.runningHead}>
      <span>{title}</span>
      <span>{note}</span>
    </div>
  );
}

function HeroGloss({
  flag,
  active = false,
  extra = false,
}: {
  flag: SampleFlag;
  active?: boolean;
  extra?: boolean;
}) {
  return (
    <div
      className={`${s.gloss} ${s.heroGloss} ${active ? s.glossActive : ""} ${extra ? s.heroExtra : ""}`}
      role="note"
      aria-label={`Flag ${flag.rank}, clause ${flag.clause}`}
    >
      <span className={s.rank}>{flag.rank}</span>
      <div>
        <p className={s.ref}>Clause {flag.clause}</p>
        <p className={s.reading}>{flag.reading}</p>
      </div>
    </div>
  );
}

function Folio({ n }: { n: number }) {
  return (
    <p className={s.folio} aria-hidden="true">
      {n}
    </p>
  );
}

function ClauseRow({ number, text }: { number: string; text: string }) {
  return (
    <>
      <span className={s.num}>{number}</span>
      <p className={s.clause}>{text}</p>
    </>
  );
}
