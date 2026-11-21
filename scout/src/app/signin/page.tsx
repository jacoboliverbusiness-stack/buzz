import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

export default function SignIn() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 pb-24 pt-16 sm:pt-24">
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Save your campaign</h1>
        <p className="mt-2 text-[15px] text-mute">We&apos;ll email you a sign-in link. No password.</p>
        <Suspense><SignInForm /></Suspense>
      </main>
    </>
  );
}
