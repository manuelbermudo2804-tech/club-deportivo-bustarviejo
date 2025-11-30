import { useEffect } from "react";
import { useTutorial } from "./TutorialProvider";

// Hook to automatically trigger tutorial on first visit to a page
export function usePageTutorial(tutorialId) {
  const tutorial = useTutorial();

  useEffect(() => {
    if (!tutorial?.isReady || !tutorialId) return;
    
    // Small delay to let the page render first
    const timer = setTimeout(() => {
      tutorial.checkAndStartTutorial(tutorialId);
    }, 800);

    return () => clearTimeout(timer);
  }, [tutorial?.isReady, tutorialId]);

  return tutorial;
}

export default usePageTutorial;