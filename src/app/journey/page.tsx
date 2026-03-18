'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIMENSIONS } from '@/lib/dimensions';
import { UIMessage, DimensionResponse } from '@/lib/types';
import WheelVisualization from '@/components/WheelVisualization';
import RatingInput from '@/components/RatingInput';
import ChatMessage from '@/components/ChatMessage';
import DimensionProgress from '@/components/DimensionProgress';

type Phase =
  | 'conversation'
  | 'rating'
  | 'reflection'
  | 'closing'
  | 'dimension-complete';

type JourneyStage = 'welcome' | 'active' | 'synthesis' | 'complete';

export default function JourneyPage() {
  // Journey-level state
  const [stage, setStage] = useState<JourneyStage>('welcome');
  const [completedDimensions, setCompletedDimensions] = useState<
    DimensionResponse[]
  >([]);

  // Current dimension state
  const [currentDimIndex, setCurrentDimIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('conversation');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');

  // Reflection state
  const [currentRating, setCurrentRating] = useState(0);
  const [lettingGo, setLettingGo] = useState('');
  const [invitingIn, setInvitingIn] = useState('');

  // Synthesis state
  const [synthesisText, setSynthesisText] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<UIMessage[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);

  // Focus input when conversation phase is active
  useEffect(() => {
    if (phase === 'conversation' && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [phase, isStreaming]);

  // Count real user messages (for showing rating prompt)
  const userExchanges = messages.filter(
    (m) => m.role === 'user' && !m.hidden
  ).length;
  const showRatingPrompt =
    phase === 'conversation' && userExchanges >= 2 && !isStreaming;

  // Ratings array for the wheel
  const ratings = DIMENSIONS.map((dim, i) => {
    const completed = completedDimensions.find((d) => d.dimensionId === dim.id);
    if (completed) return completed.rating;
    if (i === currentDimIndex && currentRating > 0) return currentRating;
    return 0;
  });

  // ─── Streaming helper ────────────────────────────────────────
  const streamFromAPI = useCallback(
    async (
      apiMessages: { role: string; content: string }[],
      options: {
        autoStart?: boolean;
        closingData?: {
          rating: number;
          lettingGo: string;
          invitingIn: string;
        };
        synthesis?: boolean;
        responses?: DimensionResponse[];
        dimensionIndex?: number;
        previousResponses?: DimensionResponse[];
      } = {}
    ): Promise<string> => {
      setIsStreaming(true);
      const assistantMsgId = crypto.randomUUID();

      // Add empty assistant message for streaming
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '' },
      ]);

      let fullContent = '';

      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            dimensionIndex: options.dimensionIndex ?? currentDimIndex,
            previousResponses:
              options.previousResponses ?? completedDimensions,
            autoStart: options.autoStart,
            closingData: options.closingData,
            synthesis: options.synthesis,
            responses: options.responses,
          }),
        });

        if (!resp.ok) {
          throw new Error(`API error: ${resp.status}`);
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: fullContent } : m
            )
          );
        }
      } catch (error) {
        console.error('Streaming error:', error);
        fullContent = 'Something went wrong. Please try again.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: fullContent } : m
          )
        );
      } finally {
        setIsStreaming(false);
      }

      return fullContent;
    },
    [currentDimIndex, completedDimensions]
  );

  // ─── Actions ─────────────────────────────────────────────────

  function handleBegin() {
    setStage('active');
    // Trigger Claude's introduction for the first dimension
    streamFromAPI([], { autoStart: true });
  }

  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userContent = input.trim();
    setInput('');

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
    };

    const currentMessages = [...messagesRef.current, userMsg];
    setMessages(currentMessages);

    // Send all visible messages to API
    const apiMessages = currentMessages
      .filter((m) => !m.hidden)
      .map((m) => ({ role: m.role, content: m.content }));

    await streamFromAPI(apiMessages);
  }

  function handleReadyToRate() {
    setPhase('rating');
  }

  function handleRate(rating: number) {
    setCurrentRating(rating);
    setPhase('reflection');
  }

  async function handleCompleteReflection() {
    if (!lettingGo.trim() || !invitingIn.trim()) return;

    setPhase('closing');

    // Save dimension response
    const response: DimensionResponse = {
      dimensionId: DIMENSIONS[currentDimIndex].id,
      rating: currentRating,
      lettingGo: lettingGo.trim(),
      invitingIn: invitingIn.trim(),
    };

    const newCompleted = [...completedDimensions, response];
    setCompletedDimensions(newCompleted);

    // Get Claude's closing reflection
    const apiMessages = messages
      .filter((m) => !m.hidden)
      .map((m) => ({ role: m.role, content: m.content }));

    await streamFromAPI(apiMessages, {
      closingData: {
        rating: currentRating,
        lettingGo: lettingGo.trim(),
        invitingIn: invitingIn.trim(),
      },
      previousResponses: newCompleted,
    });

    setPhase('dimension-complete');
  }

  async function handleNextDimension() {
    if (currentDimIndex >= 7) {
      // All dimensions complete → synthesis
      setStage('synthesis');
      setMessages([]);
      setSynthesisText('');

      const text = await streamFromAPI([], {
        synthesis: true,
        responses: completedDimensions,
      });
      setSynthesisText(text);
      return;
    }

    // Reset for next dimension
    const nextIndex = currentDimIndex + 1;
    setCurrentDimIndex(nextIndex);
    setPhase('conversation');
    setCurrentRating(0);
    setLettingGo('');
    setInvitingIn('');
    setMessages([]);

    // Trigger introduction for next dimension
    await streamFromAPI([], {
      autoStart: true,
      dimensionIndex: nextIndex,
    });
  }

  function handleComplete() {
    setStage('complete');
  }

  // ─── Render ──────────────────────────────────────────────────

  if (stage === 'welcome') {
    return <WelcomeScreen onBegin={handleBegin} />;
  }

  if (stage === 'complete') {
    return (
      <CompleteScreen
        ratings={ratings}
        synthesis={synthesisText}
        onStartOver={() => {
          setStage('welcome');
          setCurrentDimIndex(0);
          setCompletedDimensions([]);
          setMessages([]);
          setPhase('conversation');
          setCurrentRating(0);
          setLettingGo('');
          setInvitingIn('');
          setSynthesisText('');
        }}
      />
    );
  }

  const currentDimension = DIMENSIONS[currentDimIndex];
  const isSynthesis = stage === 'synthesis';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header with wheel — sticky */}
      <header className="shrink-0 border-b border-border-light bg-background z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-sm text-foreground-muted">
            Wheel of Aliveness
          </h2>
          {!isSynthesis && (
            <DimensionProgress
              currentIndex={currentDimIndex}
              completedCount={completedDimensions.length}
            />
          )}
        </div>

        {/* Wheel — always visible at top */}
        <div className="flex flex-col items-center pb-0 -mt-4 -mb-2">
          <WheelVisualization
            ratings={ratings}
            currentDimension={currentDimIndex}
            size={340}
          />
        </div>
      </header>

      {/* Conversation panel — scrollable */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
        {/* Dimension header */}
        {!isSynthesis && (
          <motion.div
            key={currentDimension.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-6 pt-4 pb-2"
          >
            <p
              className="text-sm font-medium"
              style={{ color: currentDimension.color }}
            >
              {currentDimIndex + 1}/8 &middot; {currentDimension.name}
            </p>
          </motion.div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            <AnimatePresence mode="wait">
              {messages
                .filter((m) => !m.hidden)
                .map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={
                      isStreaming && i === messages.filter((m) => !m.hidden).length - 1
                    }
                  />
                ))}
            </AnimatePresence>

            {/* Streaming indicator when no content yet */}
            {isStreaming &&
              messages.length > 0 &&
              messages[messages.length - 1].content === '' && (
                <div className="flex gap-1.5 py-2">
                  <span className="typing-dot w-2 h-2 rounded-full bg-foreground-muted" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-foreground-muted" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-foreground-muted" />
                </div>
              )}

            {/* Rating prompt — now shown inline below, not here */}

            {/* Rating input */}
            {phase === 'rating' && (
              <RatingInput
                onRate={handleRate}
                dimensionColor={currentDimension.color}
              />
            )}

            {/* Reflection inputs */}
            {phase === 'reflection' && (
              <ReflectionPanel
                lettingGo={lettingGo}
                invitingIn={invitingIn}
                onLettingGoChange={setLettingGo}
                onInvitingInChange={setInvitingIn}
                onComplete={handleCompleteReflection}
                dimensionColor={currentDimension.color}
              />
            )}

            {/* Continue to next dimension */}
            {phase === 'dimension-complete' && !isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-4 flex justify-center"
              >
                <button
                  onClick={handleNextDimension}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  {currentDimIndex < 7
                    ? `Continue to ${DIMENSIONS[currentDimIndex + 1].name}`
                    : 'See Your Wheel'}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
              </motion.div>
            )}

            {/* Synthesis complete */}
            {isSynthesis && !isStreaming && synthesisText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-6 flex justify-center"
              >
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  Complete Your Journey
                </button>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {phase === 'conversation' && (
            <div className="px-6 pb-6 pt-3 space-y-2 border-t border-border-light">
              {showRatingPrompt && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    type="button"
                    onClick={handleReadyToRate}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    I&apos;m ready to rate this dimension
                  </button>
                </motion.div>
              )}
              <form onSubmit={handleSendMessage}>
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Continue sharing..."
                    disabled={isStreaming}
                    rows={1}
                    autoFocus
                    className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3.5 pr-10 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-sm transition-all disabled:opacity-50 min-h-[48px] max-h-[120px]"
                  />
                  {input.trim() && !isStreaming && (
                    <button
                      type="submit"
                      className="absolute right-3 bottom-3.5 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md text-center"
      >
        <h1 className="text-3xl font-medium text-foreground mb-6">
          Welcome
        </h1>
        <p className="text-base text-foreground leading-relaxed mb-4">
          You&apos;re about to reflect on eight dimensions of your life. Not to
          analyze — but to feel into where things are alive and where they feel
          heavier.
        </p>
        <p className="text-sm text-foreground-muted leading-relaxed mb-4">
          You won&apos;t need your strategic mind here. You&apos;ll need
          something deeper: the willingness to listen to what you already know
          but haven&apos;t said out loud.
        </p>
        <p className="text-sm text-foreground-muted leading-relaxed mb-8">
          Respond intuitively. Your first instinct is usually the most honest.
        </p>
        <button
          onClick={onBegin}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium text-white bg-primary hover:bg-primary-hover transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          Let&apos;s begin
        </button>
        <p className="mt-4 text-xs text-foreground-muted">
          About 30 minutes
        </p>
      </motion.div>
    </main>
  );
}

function ReflectionPanel({
  lettingGo,
  invitingIn,
  onLettingGoChange,
  onInvitingInChange,
  onComplete,
  dimensionColor,
}: {
  lettingGo: string;
  invitingIn: string;
  onLettingGoChange: (v: string) => void;
  onInvitingInChange: (v: string) => void;
  onComplete: () => void;
  dimensionColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 py-4"
    >
      <div>
        <label className="block text-sm text-foreground mb-2">
          What are you ready to let go of?
        </label>
        <p className="text-xs text-foreground-muted mb-2">
          A mindset, habit, role, expectation, or belief that no longer serves
          you.
        </p>
        <textarea
          value={lettingGo}
          onChange={(e) => onLettingGoChange(e.target.value)}
          placeholder="What am I carrying that's weighing me down?"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm text-foreground mb-2">
          What do you want to invite in?
        </label>
        <p className="text-xs text-foreground-muted mb-2">
          A feeling, practice, boundary, dream, or fresh perspective.
        </p>
        <textarea
          value={invitingIn}
          onChange={(e) => onInvitingInChange(e.target.value)}
          placeholder="What's trying to emerge in this part of my life?"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <button
        onClick={onComplete}
        disabled={!lettingGo.trim() || !invitingIn.trim()}
        className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        style={{ backgroundColor: dimensionColor }}
      >
        Complete this dimension
      </button>
    </motion.div>
  );
}

function CompleteScreen({
  ratings,
  synthesis,
  onStartOver,
}: {
  ratings: number[];
  synthesis: string;
  onStartOver: () => void;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-medium text-foreground mb-3">
            Your Wheel of Aliveness
          </h1>
          <p className="text-sm text-foreground-muted">
            This is your honest snapshot — where aliveness flows and where
            it&apos;s stuck.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex justify-center mb-10"
        >
          <WheelVisualization
            ratings={ratings}
            currentDimension={-1}
            size={400}
            showLabels={true}
          />
        </motion.div>

        {synthesis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="max-w-xl mx-auto mb-10"
          >
            <div className="text-base leading-relaxed text-foreground whitespace-pre-line">
              {synthesis}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center space-y-3"
        >
          <p className="text-xs text-foreground-muted">
            Keep this. Come back to it. At the end of your Explorer journey,
            complete it again. The shift might surprise you.
          </p>
          <button
            onClick={onStartOver}
            className="text-sm text-foreground-muted hover:text-foreground transition-colors underline underline-offset-4 cursor-pointer"
          >
            Start a new wheel
          </button>
        </motion.div>
      </div>
    </main>
  );
}
