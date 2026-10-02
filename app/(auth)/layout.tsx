import Link from "next/link";
import s from "./auth.module.css";

// Sign-in and sign-up sit on the same cloth as the landing page: one leaf,
// the wordmark above it.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.cloth}>
      <header className={s.band}>
        <Link href="/" className={s.wordmark}>
          Redline
        </Link>
      </header>
      <main className={s.leaf}>{children}</main>
    </div>
  );
}
