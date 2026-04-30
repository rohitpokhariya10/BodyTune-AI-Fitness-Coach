import { gsap } from "gsap";
import { useLayoutEffect, useRef, type DependencyList } from "react";

type AnimationTarget = gsap.TweenTarget;

type EntranceOptions = {
  delay?: number;
  duration?: number;
  ease?: string;
  stagger?: number;
};

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function reducedMotionSet(target: AnimationTarget) {
  gsap.set(target, {
    autoAlpha: 1,
    clearProps: "transform",
  });
}

export function fadeUp(target: AnimationTarget, options: EntranceOptions = {}) {
  if (prefersReducedMotion()) {
    reducedMotionSet(target);
    return gsap.timeline();
  }

  return gsap.fromTo(
    target,
    { autoAlpha: 0, y: 26 },
    {
      autoAlpha: 1,
      delay: options.delay ?? 0,
      duration: options.duration ?? 0.72,
      ease: options.ease ?? "power3.out",
      stagger: options.stagger,
      y: 0,
    },
  );
}

export function staggerCards(
  target: AnimationTarget,
  options: EntranceOptions = {},
) {
  if (prefersReducedMotion()) {
    reducedMotionSet(target);
    return gsap.timeline();
  }

  return gsap.fromTo(
    target,
    { autoAlpha: 0, y: 24, scale: 0.985 },
    {
      autoAlpha: 1,
      delay: options.delay ?? 0,
      duration: options.duration ?? 0.68,
      ease: options.ease ?? "power3.out",
      scale: 1,
      stagger: options.stagger ?? 0.075,
      y: 0,
    },
  );
}

export function scaleIn(target: AnimationTarget, options: EntranceOptions = {}) {
  if (prefersReducedMotion()) {
    reducedMotionSet(target);
    return gsap.timeline();
  }

  return gsap.fromTo(
    target,
    { autoAlpha: 0, scale: 0.94 },
    {
      autoAlpha: 1,
      delay: options.delay ?? 0,
      duration: options.duration ?? 0.62,
      ease: options.ease ?? "back.out(1.45)",
      scale: 1,
    },
  );
}

export function slideInLeft(
  target: AnimationTarget,
  options: EntranceOptions = {},
) {
  if (prefersReducedMotion()) {
    reducedMotionSet(target);
    return gsap.timeline();
  }

  return gsap.fromTo(
    target,
    { autoAlpha: 0, x: -34 },
    {
      autoAlpha: 1,
      delay: options.delay ?? 0,
      duration: options.duration ?? 0.72,
      ease: options.ease ?? "power3.out",
      x: 0,
    },
  );
}

export function slideInRight(
  target: AnimationTarget,
  options: EntranceOptions = {},
) {
  if (prefersReducedMotion()) {
    reducedMotionSet(target);
    return gsap.timeline();
  }

  return gsap.fromTo(
    target,
    { autoAlpha: 0, x: 34 },
    {
      autoAlpha: 1,
      delay: options.delay ?? 0,
      duration: options.duration ?? 0.72,
      ease: options.ease ?? "power3.out",
      x: 0,
    },
  );
}

export function pageReveal(scope: ParentNode = document) {
  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  if (prefersReducedMotion()) {
    gsap.set(scope.querySelectorAll("[data-gsap]"), {
      autoAlpha: 1,
      clearProps: "transform",
    });
    return timeline;
  }

  timeline
    .add(fadeUp(scope.querySelectorAll("[data-gsap='fade-up']"), { stagger: 0.05 }))
    .add(
      staggerCards(scope.querySelectorAll("[data-gsap='card']"), {
        stagger: 0.07,
      }),
      "-=0.42",
    )
    .add(scaleIn(scope.querySelectorAll("[data-gsap='scale-in']")), "-=0.44")
    .add(slideInLeft(scope.querySelectorAll("[data-gsap='slide-left']")), "-=0.5")
    .add(slideInRight(scope.querySelectorAll("[data-gsap='slide-right']")), "-=0.62");

  return timeline;
}

export function useGsapEntrance<TElement extends HTMLElement>(
  setup: (scope: TElement) => void | gsap.core.Animation,
  deps: DependencyList = [],
) {
  const scopeRef = useRef<TElement>(null);

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) {
      return undefined;
    }

    const context = gsap.context(() => {
      setup(scope);
    }, scope);

    return () => context.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scopeRef;
}
