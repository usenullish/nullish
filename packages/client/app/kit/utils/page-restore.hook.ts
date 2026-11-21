import { useEffect, useEffectEvent } from "react";

export const usePageRestore = ({ onRestore }: { onRestore: () => void }) => {
  const restore = useEffectEvent(onRestore);

  useEffect(() => {
    const onPageShow = ({ persisted }: PageTransitionEvent) => {
      if (persisted) {
        restore();
      }
    };

    window.addEventListener("pageshow", onPageShow);

    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
};
