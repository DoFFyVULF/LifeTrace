import { Header } from "../header/Header";

export function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <main className="profile-main">
        {children}
      </main>
    </div>
  );
}
