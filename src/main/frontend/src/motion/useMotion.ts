import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import type { NavigateOptions, To } from "react-router-dom";

export type RouteDirection = "forward" | "back" | "fade";

type NavigatorExtended = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function useMotionPrefs() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const lite = (() => {
    if (reduced || typeof navigator === "undefined") return reduced;
    const nav = navigator as NavigatorExtended;
    const lowCores = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
    const saveData = Boolean(nav.connection?.saveData);
    return lowCores || lowMem || saveData;
  })();

  return { reduced, lite };
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
}) {
  const ref = useRef<T>(null);
  const { reduced } = useMotionPrefs();
  const [visible, setVisible] = useState(() => Boolean(options?.disabled || reduced));

  useEffect(() => {
    if (visible || options?.disabled || reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96 && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: options?.threshold ?? 0.08,
        rootMargin: options?.rootMargin ?? "0px 0px -32px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, options?.disabled, options?.threshold, options?.rootMargin, reduced]);

  return { ref, visible };
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 18, enabled = true) {
  const ref = useRef<T>(null);
  const { reduced, lite } = useMotionPrefs();

  useEffect(() => {
    if (!enabled || reduced || lite || typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      if (rect.bottom < -60 || rect.top > vh + 60) return;
      const progress = (rect.top + rect.height * 0.5 - vh * 0.5) / vh;
      const offset = Math.max(-speed, Math.min(speed, progress * speed));
      const img = el.querySelector("img");
      if (img) {
        img.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.07)`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed, enabled, reduced, lite]);

  return ref;
}

export function useAnimatedNumber(target: number, duration = 360) {
  const { reduced } = useMotionPrefs();
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const startVal = prevRef.current;
    if (reduced || !Number.isFinite(target) || startVal === target) {
      prevRef.current = target;
      setDisplay(target);
      return;
    }

    let raf = 0;
    const startTime = performance.now();
    const diff = target - startVal;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startVal + diff * eased;
      setDisplay(next);
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
        setDisplay(target);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      prevRef.current = target;
    };
  }, [target, duration, reduced]);

  return display;
}

const ROUTE_RANK: Record<string, number> = {
  "/": 0,
  "/inicio": 1,
  "/catalogo": 2,
  "/equipe": 2,
  "/galeria": 2,
  "/agendar": 3,
  "/login": 4,
  "/cadastro": 4,
  "/meus-horarios": 2,
  "/fidelidade": 2,
  "/perfil": 2,
  "/painel": 1,
  "/agenda": 2,
  "/clientes": 2,
  "/servicos": 2,
  "/profissionais": 2,
  "/expediente": 2,
  "/marca": 2,
  "/usuarios": 2,
  "/permissoes": 2,
  "/atribuir-permissoes": 2,
};

function rankOf(pathname: string) {
  if (pathname in ROUTE_RANK) return ROUTE_RANK[pathname];
  if (pathname.startsWith("/equipe/") || pathname.startsWith("/clientes/") || pathname.startsWith("/usuarios/") || pathname.startsWith("/permissoes/")) {
    return 3;
  }
  return 2;
}

export function useRouteDirection(): RouteDirection {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(pathname);
  const [dir, setDir] = useState<RouteDirection>("fade");

  useEffect(() => {
    if (prevPath.current === pathname) return;
    if (navType === "POP") {
      setDir("back");
    } else {
      const prevRank = rankOf(prevPath.current);
      const nextRank = rankOf(pathname);
      setDir(nextRank > prevRank ? "forward" : nextRank < prevRank ? "back" : "fade");
    }
    prevPath.current = pathname;
  }, [pathname, navType]);

  return dir;
}

type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export function useSmoothNavigate() {
  const navigate = useNavigate();
  const { reduced } = useMotionPrefs();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      const doc = document as DocumentWithVT;
      if (!reduced && typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => {
          navigate(to, options);
        });
      } else {
        navigate(to, options);
      }
    },
    [navigate, reduced]
  );
}
