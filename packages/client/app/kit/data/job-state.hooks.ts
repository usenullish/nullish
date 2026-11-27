import { type Option, type Result } from "@usenullish/nullish-common";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";

export const usePollJobState = <T extends { status: string }>({
  jobId,
  getJobState,
  onDone,
  intervalMs = 1000,
  maxAttempts = 30,
}: {
  jobId: string;
  getJobState: () => Promise<Result<T>>;
  onDone?: (state: T) => Promise<void> | void;
  intervalMs?: number;
  maxAttempts?: number;
}): { state: Option<T>; timedOut: boolean } => {
  const [state, setState] = useState<T>();
  const [timedOut, setTimedOut] = useState(false);
  const timeout = useRef<Option<ReturnType<typeof setTimeout>>>(undefined);

  const fetchJobState = useEffectEvent(getJobState);
  const done = useEffectEvent(async (jobState: T) => await onDone?.(jobState));

  useEffect(() => {
    const controller = new AbortController();

    const poll = async (attempt: number) => {
      const result = await fetchJobState();

      if (controller.signal.aborted) {
        return;
      }

      if (
        result.status === "success" &&
        (result.result.status === "completed" || result.result.status === "failed")
      ) {
        const { result: jobState } = result;
        await done(jobState);
        startTransition(() => setState(jobState));
        return;
      }

      if (attempt >= maxAttempts) {
        startTransition(() => setTimedOut(true));
        return;
      }

      timeout.current = setTimeout(() => void poll(attempt + 1), intervalMs);
    };

    void poll(1);

    return () => {
      controller.abort();
      clearTimeout(timeout.current);
    };
  }, [jobId, intervalMs, maxAttempts]);

  return { state, timedOut };
};
