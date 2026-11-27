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
    const ultraLowCores = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2;
    const ultraLowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
    const saveData = Boolean(nav.connection?.saveData);
    return (ultraLowCores && ultraLowMem) || saveData;
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
  const [visible, setVisible] = useState(false);
  const efetivamenteVisivel =
    visible || Boolean(options?.disabled || reduced) || typeof IntersectionObserver === "undefined";

  useEffect(() => {
    if (efetivamenteVisivel) return;
    const el = ref.current;
    if (!el) return;

    let revealed = false;
    let rafId = 0;

    const trigger = () => {
      if (revealed) return;
      revealed = true;
      rafId = window.requestAnimationFrame(() => setVisible(true));
    };

    const checkRect = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.96 && rect.bottom > -20) {
        trigger();
        return true;
      }
      return false;
    };

    if (checkRect()) return () => window.cancelAnimationFrame(rafId);

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          trigger();
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.04, rootMargin: options?.rootMargin ?? "0px 0px -16px 0px" }
    );
    observer.observe(el);

    const onScroll = () => {
      if (checkRect()) {
        observer.disconnect();
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [efetivamenteVisivel, options?.threshold, options?.rootMargin]);

  return { ref, visible: efetivamenteVisivel };
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(travel = 26, enabled = true) {
  const containerRef = useRef<T>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const { reduced, lite } = useMotionPrefs();

  useEffect(() => {
    const layer = layerRef.current;
    if (!enabled || reduced || lite || typeof window === "undefined") {
      if (layer) layer.style.transform = "";
      return;
    }
    const container = containerRef.current;
    if (!container || !layer) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      const progress = (rect.top + rect.height * 0.5 - vh * 0.5) / (vh * 0.65);
      const offset = Math.max(-1, Math.min(1, progress)) * travel;
      layer.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.1)`;
    };

    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [travel, enabled, reduced, lite]);

  return { containerRef, layerRef };
}

export function useAnimatedNumber(target: number, duration = 340) {
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
      setDisplay(startVal + diff * eased);
      if (t < 1) raf = window.requestAnimationFrame(tick);
      else { prevRef.current = target; setDisplay(target); }
    };

    raf = window.requestAnimationFrame(tick);
    return () => { window.cancelAnimationFrame(raf); prevRef.current = target; };
  }, [target, duration, reduced]);

  return display;
}

const ROUTE_RANK: Record<string, number> = {
  "/": 0, "/inicio": 1, "/catalogo": 2, "/equipe": 2, "/galeria": 2,
  "/agendar": 3, "/login": 4, "/cadastro": 4, "/meus-horarios": 2,
  "/fidelidade": 2, "/perfil": 2, "/painel": 1, "/agenda": 2, "/clientes": 2,
  "/servicos": 2, "/profissionais": 2, "/expediente": 2, "/marca": 2,
  "/usuarios": 2, "/permissoes": 2, "/atribuir-permissoes": 2,
};

function rankOf(pathname: string) {
  if (pathname in ROUTE_RANK) return ROUTE_RANK[pathname];
  if (pathname.startsWith("/equipe/") || pathname.startsWith("/clientes/") || pathname.startsWith("/usuarios/") || pathname.startsWith("/permissoes/")) return 3;
  return 2;
}

export function useRouteDirection(): RouteDirection {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const [navState, setNavState] = useState<{ path: string; dir: RouteDirection }>({ path: pathname, dir: "fade" });

  let dir = navState.dir;
  if (navState.path !== pathname) {
    if (navType === "POP") dir = "back";
    else {
      const prevRank = rankOf(navState.path);
      const nextRank = rankOf(pathname);
      dir = nextRank > prevRank ? "forward" : nextRank < prevRank ? "back" : "fade";
    }
    setNavState({ path: pathname, dir });
  }

  useEffect(() => {
    document.documentElement.dataset.routeDir = dir;
  }, [dir]);

  return dir;
}

type DocumentWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function useSmoothNavigate() {
  const navigate = useNavigate();
  const { reduced } = useMotionPrefs();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      const doc = document as DocumentWithVT;
      if (!reduced && typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => { navigate(to, options); });
      } else {
        navigate(to, options);
      }
    },
    [navigate, reduced]
  );
}
