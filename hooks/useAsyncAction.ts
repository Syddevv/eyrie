import { useCallback, useRef, useState } from "react";

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useAsyncAction() {
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);

  const run = useCallback(async <T,>(task: () => Promise<T>) => {
    if (isRunningRef.current) {
      return undefined;
    }

    isRunningRef.current = true;
    setIsRunning(true);

    try {
      await waitForNextFrame();
      return await task();
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  return { isRunning, run } as const;
}
