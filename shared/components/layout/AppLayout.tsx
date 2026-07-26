import { Header } from "../header/Header";
import { Sidebar } from "./Sidebar";
import { DetailsPanel } from "./DetailsPanel";
import { Timeline } from "./Timeline";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-grid">
        <Sidebar />
        {children}
        <DetailsPanel />
      </main>
      <Timeline />
    </div>
  );
}
