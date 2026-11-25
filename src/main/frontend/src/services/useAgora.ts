import { useEffect, useState } from "react";

export function useAgora() {
  const [agora, setAgora] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return agora;
}
