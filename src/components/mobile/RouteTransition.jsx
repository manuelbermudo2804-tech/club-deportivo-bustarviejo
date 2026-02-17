import React from "react";
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, x: 30 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -30 },
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.2,
};

export default function RouteTransition({ children, locationKey }) {
  return (
    <motion.div
      key={locationKey}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}