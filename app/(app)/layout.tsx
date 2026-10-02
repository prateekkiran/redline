import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { BindingNav } from "./BindingNav";
import s from "./app.module.css";

// The signed-in frame. The cloth narrows to a binding edge holding the
// navigation; the bright page takes the rest of the viewport.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  // The proxy already turns signed-out visitors away; this is the check that
  // actually asks Supabase, so a stale cookie can't render the app.
  if (viewer.configured && !viewer.user) redirect("/sign-in");

  return (
    <div className={s.shell}>
      <header className={s.binding}>
        <Link href="/analyze" className={s.wordmark}>
          Redline
        </Link>
        <BindingNav />
        <div className={s.account}>
          {viewer.user ? (
            <>
              <p className={s.who}>{viewer.user.email}</p>
              <form action={signOut}>
                <button type="submit" className={s.signOut}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <p className={s.who}>Accounts aren&rsquo;t set up, so nothing is saved.</p>
          )}
        </div>
      </header>
      <main className={s.page}>{children}</main>
    </div>
  );
}
