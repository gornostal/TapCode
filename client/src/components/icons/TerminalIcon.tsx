import { SVGProps } from "react";

const TerminalIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="7,9 10,12 7,15" />
    <line x1="12" y1="15" x2="17" y2="15" />
  </svg>
);

export default TerminalIcon;
