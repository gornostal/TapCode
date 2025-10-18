import { SVGProps } from "react";

const GitBranchIcon = (props: SVGProps<SVGSVGElement>) => (
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
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="12" cy="18" r="2" />
    <path d="M6 8v4a4 4 0 0 0 4 4h2" />
    <path d="M18 8v4a4 4 0 0 1-4 4h-2" />
  </svg>
);

export default GitBranchIcon;
