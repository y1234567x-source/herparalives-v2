import type { Dimension } from "@/lib/dimensions";

export default function FragmentGem({
  dimension,
  className = "",
}: {
  dimension?: Dimension;
  className?: string;
}) {
  return (
    <svg
      className={"fragment-gem " + className}
      viewBox="0 0 80 94"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M40 3 70 26 65 67 40 91 14 67 10 26Z"
        fill="currentColor"
        fillOpacity=".12"
        stroke="currentColor"
        strokeOpacity=".7"
      />
      <path
        d="m40 3-9 32 9 56 12-56L40 3ZM10 26l21 9 21 0 18-9M14 67l17-32m34 32L52 35"
        stroke="currentColor"
        strokeOpacity=".45"
      />
      <path
        d="m40 25 3 13 10 5-10 5-3 14-4-14-10-5 10-5Z"
        fill="currentColor"
        fillOpacity=".9"
      />
      {dimension === "stability" && (
        <path
          d="M22 58h36M26 64h28"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
      {dimension === "freedom" && (
        <path
          d="M24 50c6-16 26-16 32 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
      {dimension === "achievement" && (
        <path d="M40 30 50 44H30L40 30Z" fill="currentColor" fillOpacity=".8" />
      )}
      {dimension === "relationship" && (
        <circle
          cx="40"
          cy="46"
          r="18"
          stroke="currentColor"
          strokeOpacity=".7"
        />
      )}
      {dimension === "self" && (
        <path
          d="M40 34 50 46 40 58 30 46Z"
          fill="currentColor"
          fillOpacity=".28"
          stroke="currentColor"
          strokeOpacity=".8"
        />
      )}
    </svg>
  );
}
