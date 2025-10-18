import { SVGProps } from "react";

const PencilIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M 16.169 3.18 C 15.625 2.635 14.887 2.33 14.117 2.33 C 13.347 2.33 12.609 2.635 12.065 3.18 L 2.555 12.689 L 2.555 16.794 L 6.66 16.794 L 16.169 7.284 C 16.714 6.74 17.019 6.002 17.019 5.232 C 17.019 4.462 16.714 3.724 16.169 3.18 Z" />
    <path d="M 11.261 4.605 L 14.744 8.088" />
  </svg>
);

export default PencilIcon;
