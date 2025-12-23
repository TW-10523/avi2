/**
 * Onboarding Tour - Guide new users through the app
 */
import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Upload, FileText, Settings } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AI Assistant! 👋',
    description: 'Let me show you around. This AI-powered chatbot helps you find information from your uploaded documents instantly.',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'chat',
    title: 'Ask Questions',
    description: 'Type your questions in natural language. The AI will search through your documents and provide accurate answers with sources.',
    icon: MessageSquare,
    position: 'center',
  },
  {
    id: 'upload',
    title: 'Upload Documents',
    description: 'Upload PDF, DOC, or TXT files. They\'ll be automatically indexed and available for AI-powered search within seconds.',
    icon: Upload,
    position: 'center',
  },
  {
    id: 'documents',
    title: 'Manage Documents',
    description: 'View, search, and organize all your uploaded documents. Delete outdated files to keep your knowledge base current.',
    icon: FileText,
    position: 'center',
  },
  {
    id: 'admin',
    title: 'Admin Dashboard',
    description: 'Access analytics, manage users, and configure settings. Monitor chatbot performance and usage statistics.',
    icon: Settings,
    position: 'center',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_completed', 'true');
    onSkip();
  };

  // Check if onboarding was already completed
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (completed === 'true') {
      setIsVisible(false);
      onComplete();
    }
  }, [onComplete]);

  if (!isVisible) return null;

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Tour Card */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
        {/* Progress bar */}
        <div className="h-1 bg-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
            <Icon className="w-8 h-8 text-blue-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-slate-400 leading-relaxed mb-8">
            {step.description}
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep 
                    ? 'w-6 bg-blue-500' 
                    : i < currentStep 
                      ? 'bg-blue-500/50' 
                      : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div className="px-8 pb-4 text-center">
          <span className="text-xs text-slate-500">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to check if user needs onboarding
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (completed !== 'true') {
      setShowOnboarding(true);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    setShowOnboarding,
    resetOnboarding,
  };
}
