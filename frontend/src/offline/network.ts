import { useEffect, useState } from "react";

type NavigatorWithConnection = Navigator & {
  connection?: EventTarget & {
    effectiveType?: string;
    saveData?: boolean;
  };
};

export function isConstrainedNetwork() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (navigator as NavigatorWithConnection).connection;
  return Boolean(
    !navigator.onLine ||
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "3g",
  );
}

export function useConstrainedNetwork() {
  const [constrained, setConstrained] = useState(isConstrainedNetwork);

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    const update = () => setConstrained(isConstrainedNetwork());

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener("change", update);

    update();

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  return constrained;
}

export function getLightPageSize(
  normalSize: number,
  lightSize: number,
  constrained = isConstrainedNetwork(),
) {
  return constrained ? lightSize : normalSize;
}
