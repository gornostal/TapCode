import { SVGProps } from "react";

const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M3 3 L13 13 M13 3 L3 13" />
  </svg>
);

export default CloseIcon;
