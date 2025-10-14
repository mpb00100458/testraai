import { TopNav } from "./TopNav";
import { LeftSidebar } from "./LeftSidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
