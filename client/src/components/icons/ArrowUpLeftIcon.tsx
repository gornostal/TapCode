import { SVGProps } from "react";

const ArrowUpLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M17 17L7 7" />
    <path d="M7 15V7h8" />
  </svg>
);

export default ArrowUpLeftIcon;
