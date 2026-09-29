import { useEffect } from "react";

import { useConstrainedNetwork } from "./network";

export function useLiteMode() {
  const enabled = useConstrainedNetwork();

  useEffect(() => {
    document.documentElement.classList.toggle("lite-mode", enabled);
  }, [enabled]);

  return enabled;
}
