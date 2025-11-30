import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Spotlight component that highlights an area
const Spotlight = ({ target, padding = 20 }) => {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (target) {
      const element = document.querySelector(target);
      if (element) {
        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - padding,
          left: r.left - padding,
          width: r.width + padding * 2,
          height: r.height + padding * 2
        });
      }
    }
  }, [target, padding]);

  if (!rect) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute rounded-2xl pointer-events-none"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.85), 0 0 30px 10px rgba(234,88,12,0.5)',
        border: '3px solid #ea580c'
      }}
    >
      {/* Pulsing effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-orange-400"
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
  );
};

// Animated hand pointer
const HandPointer = ({ position }) => (
  <motion.div
    className="absolute text-5xl z-50 pointer-events-none"
    style={{ top: position?.top, left: position?.left }}
    animate={{ 
      y: [0, -10, 0],
      rotate: [0, -5, 0]
    }}
    transition={{ duration: 1, repeat: Infinity }}
  >
    👆
  </motion.div>
);

export default function TutorialOverlay({ 
  tutorialId,
  steps,
  onComplete,
  onSkip 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsExiting(true);
    
    // Mark tutorial as completed
    try {
      const user = await base44.auth.me();
      const completedTutorials = user.tutorials_completados || {};
      completedTutorials[tutorialId] = true;
      await base44.auth.updateMe({ tutorials_completados: completedTutorials });
    } catch (error) {
      console.error("Error saving tutorial progress:", error);
    }
    
    setTimeout(() => {
      onComplete?.();
    }, 500);
  };

  const handleSkip = async () => {
    setIsExiting(true);
    
    try {
      const user = await base44.auth.me();
      const completedTutorials = user.tutorials_completados || {};
      completedTutorials[tutorialId] = true;
      await base44.auth.updateMe({ tutorials_completados: completedTutorials });
    } catch (error) {
      console.error("Error saving tutorial progress:", error);
    }
    
    setTimeout(() => {
      onSkip?.();
    }, 300);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/80" />

          {/* Spotlight on target element */}
          {step.target && <Spotlight target={step.target} padding={step.padding || 20} />}

          {/* Hand pointer if needed */}
          {step.pointerPosition && <HandPointer position={step.pointerPosition} />}

          {/* Tutorial card */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
            className="absolute bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[500px] md:max-w-[90vw]"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header with icon */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${step.iconBg || 'bg-gradient-to-br from-orange-100 to-orange-200'}`}
                  >
                    {step.icon}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl font-bold text-slate-900 mb-1"
                    >
                      {step.title}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-slate-600 text-sm leading-relaxed"
                    >
                      {step.description}
                    </motion.p>
                  </div>
                </div>

                {/* Tips or extra info */}
                {step.tip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                  >
                    <p className="text-sm text-green-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{step.tip}</span>
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer with navigation */}
              <div className="px-6 pb-6 flex items-center justify-between gap-3">
                <button
                  onClick={handleSkip}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Saltar tutorial
                </button>

                <div className="flex items-center gap-2">
                  {/* Step indicators */}
                  <div className="flex gap-1.5 mr-3">
                    {steps.map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentStep 
                            ? 'bg-orange-500' 
                            : i < currentStep 
                              ? 'bg-green-500' 
                              : 'bg-slate-200'
                        }`}
                        animate={i === currentStep ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.5, repeat: i === currentStep ? Infinity : 0 }}
                      />
                    ))}
                  </div>

                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      className="rounded-full"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleNext}
                    size="sm"
                    className={`rounded-full px-6 ${
                      isLastStep 
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                        : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                    }`}
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        ¡Entendido!
                      </>
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Skip button in corner */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}