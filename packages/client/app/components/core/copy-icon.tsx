import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { cn } from "cn";

const CHECK_DURATION = 250;

const DrawnCopyCheck = () => {
  const checkRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    checkRef.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: CHECK_DURATION,
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
      <path ref={checkRef} d="M4 12l5 5L20 6" pathLength={1} strokeDasharray={1} />
    </svg>
  );
};

export const CopyIcon = ({ copied }: { copied: boolean }) => {
  const [hasCopied, setHasCopied] = useState(false);

  if (copied && !hasCopied) {
    setHasCopied(true);
  }

  return copied ? (
    <DrawnCopyCheck />
  ) : (
    <Copy
      className={cn(
        hasCopied && "animate-in duration-200 fade-in zoom-in-75 motion-reduce:animate-none",
      )}
    />
  );
};
