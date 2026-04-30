import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background motion-safe-bg"
    >
      <motion.div
        className="absolute inset-0 opacity-35"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(120deg, hsl(var(--primary) / 0.08), transparent 28%, rgb(var(--app-success-rgb) / 0.025) 50%, transparent 72%, hsl(var(--primary) / 0.06))",
          backgroundSize: "220% 220%",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "linear-gradient(to bottom, transparent, black 18%, black 72%, transparent)",
        }}
      />
      <motion.div
        className="absolute left-[-20%] top-[18%] h-px w-[140%] bg-gradient-to-r from-transparent via-primary/18 to-transparent"
        animate={{ x: ["-8%", "8%", "-8%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[24%] left-[-10%] h-px w-[130%] bg-gradient-to-r from-transparent via-primary/12 to-transparent"
        animate={{ x: ["6%", "-6%", "6%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
