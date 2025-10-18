import { SVGProps } from "react";

const RunTaskIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12.162" cy="3.276" r="1.516" />
    <path d="M 12.162 4.791 L 12.162 7.064" />
    <rect x="3.321" y="8.328" width="17.682" height="12.63" rx="2" />
    <path d="M 2.058 12.117 L 2.058 17.169" />
    <path d="M 22.267 12.117 L 22.267 17.169" />
    <circle
      cx="8.373"
      cy="13.379"
      r="1.263"
      fill="currentColor"
      stroke="none"
    />
    <circle
      cx="15.952"
      cy="13.379"
      r="1.263"
      fill="currentColor"
      stroke="none"
    />
    <path d="M 8.373 17.8 L 15.952 17.8" />
    <path d="M 10.267 20.958 L 14.056 20.958" />
  </svg>
);

export default RunTaskIcon;
