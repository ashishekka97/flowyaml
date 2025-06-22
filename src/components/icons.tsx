import React from 'react';

export const DecisionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" {...props}>
    <polygon points="50,0 100,50 50,100 0,50" />
  </svg>
);

export const TerminatorIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 50" {...props}>
    <rect width="100" height="50" rx="25" ry="25" />
  </svg>
);
