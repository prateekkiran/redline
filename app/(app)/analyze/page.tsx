import type { Metadata } from "next";
import s from "../app.module.css";

export const metadata: Metadata = { title: "Document · Redline" };

export default function AnalyzePage() {
  return (
    <div className={s.sheet}>
      <p className={s.runningHead}>
        <span>Document</span>
        <span>Freelance agreements and general contracts</span>
      </p>
      <div className={s.text}>
        <h1 className={s.title}>Read a contract before you sign it</h1>
        <p className={s.lede}>
          Paste the text of a freelance agreement or general contract, or
          upload a PDF you can select text in. Redline quotes back each
          sentence that reaches past the job you&rsquo;re being hired for,
          ranks them, and drafts a counter-offer for each.
        </p>
      </div>
    </div>
  );
}
