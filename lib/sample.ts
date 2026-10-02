// Hand-written sample for the landing page. The contract is made up and the
// flags were written by hand to show the format; PRD.md requires replacing
// them with real analyzeDocument output before launch.

export type Clause = { number: string; text: string };
export type Section = { heading: string; clauses: Clause[] };

export type SampleFlag = {
  rank: number;
  clause: string;
  /** Must be an exact substring of the clause text (ADR 0001). */
  quote: string;
  reading: string;
  counterOffer: string;
};

export const sampleTitle = "Freelance Design Services Agreement";

export const sampleParties =
  'This Agreement is between Halden & Rowe Ltd ("the Client") and the designer named below ("the Designer").';

export const sampleSections: Section[] = [
  {
    heading: "The Project",
    clauses: [
      {
        number: "1.1",
        text: 'The Designer will design a logo, brand guidelines and launch assets for the Client, as described in Schedule A (the "Project").',
      },
      {
        number: "1.2",
        text: 'This Agreement starts on the date it is signed and ends when the Client accepts the final Deliverables (the "Term").',
      },
    ],
  },
  {
    heading: "Fees",
    clauses: [
      { number: "2.1", text: "The Client will pay the fees set out in Schedule A." },
      { number: "2.2", text: "The Client will pay each invoice within thirty (30) days of receipt." },
    ],
  },
  {
    heading: "Ownership",
    clauses: [
      {
        number: "3.1",
        text: "The Designer assigns to the Client all right, title and interest in all work product created by the Designer during the Term, whether or not related to the Project.",
      },
    ],
  },
  {
    heading: "After the Agreement",
    clauses: [
      {
        number: "4.1",
        text: "For twenty-four (24) months after this Agreement ends, the Designer will not provide design services to any business that competes with the Client, anywhere in the world.",
      },
    ],
  },
  {
    heading: "Ending the Agreement",
    clauses: [
      {
        number: "5.1",
        text: "Either party may end this Agreement if the other materially breaches it and does not fix the breach within fourteen (14) days of written notice.",
      },
      {
        number: "5.2",
        text: "The Client may terminate this Agreement at any time for convenience, and will owe the Designer only for Deliverables accepted before the termination date.",
      },
    ],
  },
  {
    heading: "Liability",
    clauses: [
      {
        number: "6.1",
        text: "The Designer will indemnify the Client against all losses arising from the Client's use of the Deliverables.",
      },
    ],
  },
  {
    heading: "Disputes",
    clauses: [
      {
        number: "7.1",
        text: "Any and all claims between the parties, however arising, shall be resolved by binding arbitration in a forum chosen by the Client.",
      },
      { number: "7.2", text: "This Agreement is governed by the laws of England and Wales." },
    ],
  },
];

export const sampleFlags: SampleFlag[] = [
  {
    rank: 1,
    clause: "3.1",
    quote:
      "The Designer assigns to the Client all right, title and interest in all work product created by the Designer during the Term, whether or not related to the Project.",
    reading:
      "This hands the client everything you make while the contract runs, including side projects and work for other clients.",
    counterOffer:
      "The Designer assigns to the Client all right, title and interest in the Deliverables, once the Client has paid the fees for them in full.",
  },
  {
    rank: 2,
    clause: "4.1",
    quote:
      "For twenty-four (24) months after this Agreement ends, the Designer will not provide design services to any business that competes with the Client, anywhere in the world.",
    reading:
      "For two years you can't design for any business that competes with this client, anywhere. That can rule out a whole industry.",
    counterOffer:
      "For six (6) months after this Agreement ends, the Designer will not use the Client's confidential information in work for any other business.",
  },
  {
    rank: 3,
    clause: "7.1",
    quote:
      "Any and all claims between the parties, however arising, shall be resolved by binding arbitration in a forum chosen by the Client.",
    reading:
      "Any dispute between you goes to arbitration, even one that has nothing to do with this job. The client picks where.",
    counterOffer:
      "Disputes arising from this Agreement will be resolved by arbitration in a forum both parties agree on.",
  },
  {
    rank: 4,
    clause: "6.1",
    quote:
      "The Designer will indemnify the Client against all losses arising from the Client's use of the Deliverables.",
    reading:
      "You'd cover the client's losses from anything they do with your work, even when you did nothing wrong. There's no limit.",
    counterOffer:
      "The Designer will indemnify the Client against losses caused by the Designer's breach of this Agreement, up to the fees paid under it.",
  },
  {
    rank: 5,
    clause: "5.2",
    quote:
      "The Client may terminate this Agreement at any time for convenience, and will owe the Designer only for Deliverables accepted before the termination date.",
    reading:
      "The client can walk away at any point and pay only for work they've already accepted. Work in progress goes unpaid.",
    counterOffer:
      "The Client may end this Agreement on fourteen (14) days' written notice and will pay for all work completed up to the date it ends.",
  },
];

export const cleanTitle = "Website Copywriting Agreement";

/** A short boilerplate agreement that the sample treats as clean. */
export const cleanSample: Clause[] = [
  {
    number: "1.1",
    text: 'The Writer will write the copy for the five website pages described in Schedule A (the "Project").',
  },
  { number: "2.1", text: "The Client will pay each invoice within thirty (30) days of receipt." },
  { number: "3.1", text: "Once the Client has paid in full, the Client owns the copy delivered for the Project." },
  {
    number: "4.1",
    text: "Either party may end this Agreement on fourteen (14) days' written notice, and the Client will pay for work done up to that date.",
  },
  { number: "5.1", text: "Disputes about this Agreement will be resolved by the courts of England and Wales." },
];

export function clauseText(number: string): string {
  for (const section of sampleSections) {
    const clause = section.clauses.find((c) => c.number === number);
    if (clause) return clause.text;
  }
  throw new Error(`Sample clause ${number} does not exist`);
}

/**
 * Throws if any flag's quote is not an exact substring of the sample
 * contract. Called at render, so a broken citation fails the build instead
 * of reaching the page.
 */
export function assertSampleCitations(): void {
  const fullText = sampleSections.flatMap((s) => s.clauses.map((c) => c.text)).join("\n");
  for (const flag of sampleFlags) {
    if (!clauseText(flag.clause).includes(flag.quote) || !fullText.includes(flag.quote)) {
      throw new Error(`Sample flag ${flag.rank} quotes text that is not in clause ${flag.clause}`);
    }
  }
}
