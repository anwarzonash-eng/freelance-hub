// app/components/AuthActions.tsx
import { cookies } from "next/headers";
import LogoutButton from "./LogoutButton";
import { use } from "react";

export default async function AuthActions() {
  const cookieStore = await cookies(); // In server components this is sync
  const isAuthenticated = cookieStore.get("authenticated")?.value === "true";

  // console.log(isAuthenticated, cookieStore, cookieStore.get("authenticated"));
  if (!isAuthenticated) {
    return null;
  }

  return <LogoutButton />;
}
