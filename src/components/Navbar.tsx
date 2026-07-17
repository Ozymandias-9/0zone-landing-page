import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";

// Sections tracked for scroll-spy. "home" has no nav link but still counts
// as the active section while the hero is in view. "contact" has no matching
// section on the page — it's a CTA, not a scroll target.
const SECTIONS = [
    { id: "home", label: "0zone" },
    { id: "services", label: "Services" },
    { id: "process", label: "Process" },
    { id: "pricing", label: "Pricing" },
    { id: "contact", hideOnDM: true, label: <button className="bg-accent text-black px-2 py-1 rounded-md hover:bg-accent/90 text-xs">Talk with us</button>},
];

const NAV_LINKS = SECTIONS.filter((s) => s.id !== "home");

const RING_RADIUS = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const COMPACT_THRESHOLD = 40;

// Runs before paint on the client so mount-time layout (mobile vs desktop,
// compact vs expanded) never flashes the wrong state; falls back to a plain
// effect during SSR, where layout effects are a no-op anyway.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const Logo = () => (
    <span className="w-4 h-4 rounded-sm bg-white shrink-0" aria-hidden="true" />
);

function NavLink({
    link,
    variant,
    onNavigate,
}: {
    link: { id: string; label: ReactNode };
    variant: "inline" | "menu";
    onNavigate: () => void;
}) {
    const className =
        variant === "inline"
            ? "w-full text-center text-xs text-shadow-sm shadow-white"
            : "w-full text-center text-xs px-1 py-2 rounded-lg hover:bg-border text-shadow-sm shadow-white";

    // The CTA is already an interactive element (a <button>) — don't nest it
    // inside an <a>, that's invalid HTML and breaks click targeting.
    if (link.id === "contact") {
        return (
            <span key={link.id} onClick={onNavigate}>
                {link.label}
            </span>
        );
    }

    return (
        <a key={link.id} href={`#${link.id}`} onClick={onNavigate} className={className}>
            {link.label}
        </a>
    );
}

export default function Navbar() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLDivElement>(null);
    const expandedRef = useRef<HTMLDivElement>(null);
    const compactRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuInnerRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<SVGCircleElement>(null);
    const progressToRef = useRef<gsap.QuickToFunc | null>(null);
    const compactStateRef = useRef(false);
    const effectiveCompactRef = useRef(false);
    const hasMountedMorphRef = useRef(false);
    const widthTweenRef = useRef<gsap.core.Tween | null>(null);

    const [compact, setCompact] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<ReactNode>(SECTIONS[0].label);

    // Below the sm breakpoint the inline link row never fits (especially
    // with the CTA button), so mobile always uses the compact pill and
    // relies on the tap-to-open menu instead.
    const effectiveCompact = compact || isMobile;

    // Single owner of the pill's width tween so scroll-driven morphs and
    // label-length resyncs can't animate `width` concurrently and fight —
    // that was producing the odd, under-padded spacing during fast scrolling.
    const setNavWidthPx = (px: number, animate: boolean) => {
        const nav = navRef.current;
        if (!nav) return;
        widthTweenRef.current?.kill();
        if (!animate) {
            gsap.set(nav, { width: px });
            widthTweenRef.current = null;
            return;
        }
        widthTweenRef.current = gsap.to(nav, {
            width: px,
            duration: 0.4,
            ease: "power3.inOut",
        });
    };

    // Detect mobile before paint so the mount-time morph effect below sees
    // the right value on its very first run instead of flashing desktop
    // layout first.
    useIsoLayoutEffect(() => {
        const mql = window.matchMedia("(min-width: 640px)");
        const update = () => setIsMobile(!mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        effectiveCompactRef.current = effectiveCompact;
    }, [effectiveCompact]);

    // Progress ring setup: dasharray + a quickTo for cheap per-frame updates.
    useEffect(() => {
        if (!ringRef.current) return;
        gsap.set(ringRef.current, {
            strokeDasharray: RING_CIRCUMFERENCE,
            strokeDashoffset: RING_CIRCUMFERENCE,
        });
        progressToRef.current = gsap.quickTo(
            ringRef.current,
            "strokeDashoffset",
            { duration: 0.3, ease: "power2.out" }
        );
    }, []);

    // Scroll progress ring + expand/compact trigger.
    useEffect(() => {
        let rafId = 0;

        const update = () => {
            rafId = 0;
            const scrollTop = window.scrollY;
            const max =
                document.documentElement.scrollHeight - window.innerHeight;
            const progress = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
            progressToRef.current?.(RING_CIRCUMFERENCE * (1 - progress));

            const shouldCompact = scrollTop > COMPACT_THRESHOLD;
            if (shouldCompact !== compactStateRef.current) {
                compactStateRef.current = shouldCompact;
                setCompact(shouldCompact);
            }
        };

        const onScroll = () => {
            if (!rafId) rafId = requestAnimationFrame(update);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        update();

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    // Scroll-spy: which section is currently centered in the viewport.
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const match = SECTIONS.find((s) => s.id === entry.target.id);
                    if (match) setActiveSection(match.label);
                });
            },
            { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
        );

        const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
            (el): el is HTMLElement => el !== null
        );
        els.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    // Morph animation between expanded and compact layouts. The first run
    // (mount) applies the correct layout instantly instead of animating, and
    // runs before paint, so a page load/refresh that starts mid-scroll (or
    // on mobile) never flashes the wrong layout.
    useIsoLayoutEffect(() => {
        const nav = navRef.current;
        const expanded = expandedRef.current;
        const compactEl = compactRef.current;
        if (!nav || !expanded || !compactEl) return;

        const showEl = effectiveCompact ? compactEl : expanded;
        const hideEl = effectiveCompact ? expanded : compactEl;
        const targetWidth = showEl.scrollWidth;

        if (!hasMountedMorphRef.current) {
            hasMountedMorphRef.current = true;
            setNavWidthPx(targetWidth, false);
            gsap.set(showEl, { opacity: 1, scale: 1, pointerEvents: "auto" });
            gsap.set(hideEl, { opacity: 0, scale: 0.92, pointerEvents: "none" });
            return;
        }

        setNavWidthPx(targetWidth, true);
        const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power3.inOut" } });
        tl.to(hideEl, { opacity: 0, scale: 0.92, pointerEvents: "none" }, 0)
            .to(showEl, { opacity: 1, scale: 1, pointerEvents: "auto" }, 0.08);

        return () => {
            tl.kill();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveCompact]);

    // Auto-close the menu if we ever leave compact display (e.g. desktop
    // scrolls back to top while it was open).
    useEffect(() => {
        if (!effectiveCompact) setMenuOpen(false);
    }, [effectiveCompact]);

    // Re-measure width when the active section label changes size while
    // compact — same shared width-tween owner, so it can't race the morph.
    useEffect(() => {
        if (!effectiveCompactRef.current || !compactRef.current) return;
        setNavWidthPx(compactRef.current.scrollWidth, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    // Open/close the dropdown that lists the nav links while compact.
    useEffect(() => {
        const menu = menuRef.current;
        const inner = menuInnerRef.current;
        if (!menu || !inner) return;

        if (menuOpen) {
            gsap.to(menu, {
                height: inner.scrollHeight,
                opacity: 1,
                pointerEvents: "auto",
                duration: 0.35,
                ease: "power3.out",
            });
        } else {
            gsap.to(menu, {
                height: 0,
                opacity: 0,
                pointerEvents: "none",
                duration: 0.25,
                ease: "power3.in",
            });
        }
    }, [menuOpen]);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!menuOpen) return;

        const onPointerDown = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);

    const toggleMenu = () => setMenuOpen((open) => !open);
    const closeMenu = () => setMenuOpen(false);

    return (
        <div
            ref={wrapperRef}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
        >
            <div
                ref={navRef}
                className="h-11 max-w-[calc(100vw-2rem)] rounded-full border border-gray-700 bg-black/20 backdrop-blur-md overflow-hidden"
            >
                <div className="relative w-full h-full">
                    <div
                        ref={expandedRef}
                        className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-5 px-5 whitespace-nowrap"
                    >
                        <Logo />
                        {NAV_LINKS.map((link) => (
                            <NavLink key={link.id} link={link} variant="inline" onNavigate={closeMenu} />
                        ))}
                    </div>

                    <div
                        ref={compactRef}
                        role="button"
                        tabIndex={0}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        onClick={toggleMenu}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleMenu();
                            }
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-2 px-3 whitespace-nowrap opacity-0 scale-95 pointer-events-none cursor-pointer"
                    >
                        <Logo />
                        <span className="w-px h-3 bg-gray-600" />
                        <span className="text-xs text-gray-200">{activeSection}</span>
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            className="-rotate-90 shrink-0"
                            aria-hidden="true"
                        >
                            <circle
                                cx="11"
                                cy="11"
                                r={RING_RADIUS}
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="2"
                            />
                            <circle
                                ref={ringRef}
                                cx="11"
                                cy="11"
                                r={RING_RADIUS}
                                fill="none"
                                className="stroke-accent"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <div
                ref={menuRef}
                className="mt-2 w-max max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-700 bg-black/80 backdrop-blur-md overflow-hidden opacity-0 pointer-events-none"
                style={{ height: 0 }}
            >
                <div ref={menuInnerRef} className="flex flex-col items-stretch gap-1 p-2 whitespace-nowrap">
                    {NAV_LINKS.filter((link) => !link.hideOnDM).map((link) => (
                        <NavLink key={link.id} link={link} variant="menu" onNavigate={closeMenu} />
                    ))}
                </div>
            </div>
        </div>
    );
}
