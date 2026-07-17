import { useEffect, useRef, useState, type CSSProperties } from "react";

const STEPS = [
    {
        title: "Discover",
        description: "A short call to understand your goals, audience, and scope before anything is built.",
    },
    {
        title: "Design",
        description: "Wireframes and visual design tailored to your brand, reviewed together at each step.",
    },
    {
        title: "Build",
        description: "Development in modern frameworks, tested across devices and browsers as we go.",
    },
    {
        title: "Launch",
        description: "We ship, monitor, and hand off — with support available after launch.",
    },
];

const STEP_VH = 70;

// rel is a card's position relative to the active step: 0 is front-and-sharp,
// positive values sit deeper in the waiting pile, negative means it already
// popped out and exited.
function cardStyle(rel: number): CSSProperties {
    if (rel < 0) {
        return {
            transform: "translateY(-48px) scale(1.02)",
            opacity: 0,
            filter: "blur(0px)",
            zIndex: 10,
            pointerEvents: "none",
        };
    }
    const depth = Math.min(rel, 3);
    const opacity = depth === 0 ? 1 : depth <= 2 ? 0.8 - depth * 0.25 : 0;
    return {
        transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.04})`,
        opacity,
        filter: `blur(${depth * 2}px)`,
        zIndex: 30 - depth,
        pointerEvents: depth === 0 ? "auto" : "none",
    };
}

function DiscoverScene() {
    return (
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            <rect x="30" y="20" width="60" height="80" rx="2" stroke="currentColor" className="text-white/25" strokeWidth="1.5" />
            <line x1="42" y1="40" x2="78" y2="40" stroke="currentColor" className="text-white/25" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="42" y1="52" x2="78" y2="52" stroke="currentColor" className="text-white/25" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="42" y1="64" x2="66" y2="64" stroke="currentColor" className="text-white/25" strokeWidth="1.5" strokeLinecap="round" />
            <g className="text-accent animate-[scan-loop_5s_ease-in-out_infinite]" stroke="currentColor" strokeWidth="1.5">
                <circle cx="86" cy="76" r="14" />
                <line x1="96" y1="86" x2="108" y2="98" strokeLinecap="round" />
            </g>
        </svg>
    );
}

function DesignScene() {
    return (
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            <path
                d="M30 100 Q 55 40 70 70 T 110 40"
                stroke="currentColor"
                className="text-accent animate-[draw-path_4s_linear_infinite]"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="220 220"
            />
            <circle cx="30" cy="100" r="3" className="text-white/40 animate-[dot-pulse_3s_ease-in-out_infinite]" fill="currentColor" />
            <circle
                cx="110"
                cy="40"
                r="3"
                className="text-white/40 animate-[dot-pulse_3s_ease-in-out_infinite]"
                style={{ animationDelay: "1s" }}
                fill="currentColor"
            />
        </svg>
    );
}

function BuildScene() {
    return (
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            <line x1="35" y1="112" x2="105" y2="112" stroke="currentColor" className="text-white/20" strokeWidth="1.5" strokeLinecap="round" />
            <g className="text-accent" stroke="currentColor" strokeWidth="1.5">
                <rect x="55" y="86" width="30" height="20" className="animate-[block-rise_2.4s_ease-in-out_infinite]" />
                <rect
                    x="55"
                    y="62"
                    width="30"
                    height="20"
                    className="animate-[block-rise_2.4s_ease-in-out_infinite]"
                    style={{ animationDelay: "0.3s" }}
                />
                <rect
                    x="55"
                    y="38"
                    width="30"
                    height="20"
                    className="animate-[block-rise_2.4s_ease-in-out_infinite]"
                    style={{ animationDelay: "0.6s" }}
                />
            </g>
        </svg>
    );
}

function LaunchScene() {
    return (
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            <circle cx="40" cy="30" r="1.5" className="text-white/40 animate-[twinkle_3s_ease-in-out_infinite]" fill="currentColor" />
            <circle
                cx="100"
                cy="24"
                r="1.5"
                className="text-white/40 animate-[twinkle_3s_ease-in-out_infinite]"
                style={{ animationDelay: "1s" }}
                fill="currentColor"
            />
            <circle
                cx="112"
                cy="60"
                r="1.5"
                className="text-white/40 animate-[twinkle_3s_ease-in-out_infinite]"
                style={{ animationDelay: "2s" }}
                fill="currentColor"
            />
            <line x1="70" y1="112" x2="70" y2="70" stroke="currentColor" className="text-white/15" strokeWidth="1.5" strokeDasharray="4 5" />
            <g
                className="text-accent animate-[rocket-launch_2.6s_ease-in-out_infinite]"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            >
                <path d="M70 50 L80 78 L70 72 L60 78 Z" />
                <line x1="70" y1="72" x2="70" y2="94" />
            </g>
        </svg>
    );
}

const SCENES = [DiscoverScene, DesignScene, BuildScene, LaunchScene];

export default function Process() {
    const wrapperRef = useRef<HTMLElement>(null);
    const activeIndexRef = useRef(0);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        let rafId = 0;

        const update = () => {
            rafId = 0;
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight;
            const scrolled = -rect.top;
            const progress = scrollable > 0 ? Math.min(1, Math.max(0, scrolled / scrollable)) : 0;
            const index = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
            if (index !== activeIndexRef.current) {
                activeIndexRef.current = index;
                setActiveIndex(index);
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

    return (
        <section id="process" ref={wrapperRef} className="relative w-full" style={{ height: `${STEPS.length * STEP_VH}vh` }}>
            <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center gap-14 px-4">
                <div className="flex flex-col items-center gap-4 text-center max-w-xl">
                    <h2 className="text-3xl">Process</h2>
                    <p className="text-sm text-gray-400">
                        A straightforward process from first conversation to launch — and beyond.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-5xl items-center">
                    <div className="relative h-64 w-full">
                        {STEPS.map((step, i) => (
                            <div
                                key={step.title}
                                className="absolute inset-0 border border-gray-900 bg-black/60 backdrop-blur-sm p-8 flex flex-col gap-3 transition-all duration-500 ease-out"
                                style={cardStyle(i - activeIndex)}
                            >
                                <span className="text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                                <h3 className="text-xl">{step.title}</h3>
                                <p className="text-sm text-gray-400">{step.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:flex relative h-64 w-full items-center justify-center border border-gray-900 bg-white/3">
                        {SCENES.map((Scene, i) => (
                            <div
                                key={i}
                                className="absolute inset-0 flex items-center justify-center text-white/80 transition-opacity duration-500 ease-out"
                                style={{ opacity: i === activeIndex ? 1 : 0 }}
                            >
                                <Scene />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
