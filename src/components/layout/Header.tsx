import { Ticket } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">
            TOTO Forecaster
          </h1>
        </div>
        {/* Future navigation items can go here */}
      </div>
    </header>
  );
}
