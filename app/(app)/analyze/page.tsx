import type { Metadata } from "next";
import shell from "../app.module.css";
import { Analyze } from "./Analyze";

export const metadata: Metadata = { title: "Document · Redline" };

export default function AnalyzePage() {
  return (
    <div className={shell.sheet}>
      <p className={shell.runningHead}>
        <span>Document</span>
        <span>Freelance agreements and general contracts</span>
      </p>
      <Analyze />
    </div>
  );
}
