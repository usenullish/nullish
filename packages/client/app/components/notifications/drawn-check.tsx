import { useEffect, useRef } from "react";

const CIRCLE_DURATION = 450;
const CHECK_DURATION = 300;

export const DrawnCheck = () => {
  const circleRef = useRef<SVGCircleElement>(null);
  const checkRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    circleRef.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: CIRCLE_DURATION,
      easing: "ease-in-out",
      fill: "backwards",
    });

    checkRef.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: CHECK_DURATION,
      delay: CIRCLE_DURATION * 0.8,
      easing: "ease-out",
      fill: "backwards",
    });
  }, []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        ref={circleRef}
        cx="12"
        cy="12"
        r="10"
        pathLength={1}
        strokeDasharray={1}
        className="origin-center -rotate-90 [transform-box:fill-box]"
      />
      <path ref={checkRef} d="M8 12l2.5 2.5L16 9" pathLength={1} strokeDasharray={1} />
    </svg>
  );
};
