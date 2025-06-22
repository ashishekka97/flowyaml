import React from 'react';
import { Workflow } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center h-16 px-6 border-b bg-card">
      <div className="flex items-center gap-2">
        <Workflow className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          FlowYAML
        </h1>
      </div>
    </header>
  );
}
