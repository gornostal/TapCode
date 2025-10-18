import { SVGProps } from "react";

const FolderIcon = (props: SVGProps<SVGSVGElement>) => (
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
    <path d="M3.5 7.5h5l2 2H20a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 20 18.5H5A1.5 1.5 0 0 1 3.5 17v-9.5Z" />
    <path d="M3.5 7.5V6A2 2 0 0 1 5.5 4h3a2 2 0 0 1 1.6.8l1.2 1.7" />
  </svg>
);

export default FolderIcon;
