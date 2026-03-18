'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DIMENSIONS } from '@/lib/dimensions';
import { UIMessage, DimensionResponse } from '@/lib/types';
import WheelVisualization from '@/components/WheelVisualization';
import RatingInput from '@/components/RatingInput';
import ChatMessage, { renderMarkdown } from '@/components/ChatMessage';
import DimensionProgress from '@/components/DimensionProgress';

const DEBUG_RESPONSES: DimensionResponse[] = DIMENSIONS.map((dim, i) => ({
  dimensionId: dim.id,
  rating: [6, 5, 6, 7, 7, 7, 9, 4][i],
  lettingGo: [
    'The belief that playing it safe is the responsible thing to do',
    'The habit of turning feelings into tasks to solve',
    'The mindset that rest is earned, not essential',
    'The need to always appear in control',
    'The guilt of not being fully committed to the thing that pays',
    'Prioritizing being liked over being honest',
    'Letting admin tasks crowd out creative time',
    'The belief that stopping means falling behind',
  ][i],
  invitingIn: [
    'Trusting the chest feeling more — letting alignment lead',
    'Permission to feel without needing to fix anything',
    'A sustainable rhythm that includes running and real sleep',
    'More conversations where I can show up without the armor',
    'Integration — making meaningful work financially sustainable',
    'The courage to have difficult conversations sooner',
    'Protecting creative blocks as sacred time',
    'Real stillness — genuine spaciousness without guilt',
  ][i],
  conversationSummary: [
    'You notice most of your decisions lately feel strategic rather than aligned. The AI coaching program was the last thing that felt genuinely yours — a calm energy in your chest versus the tight, calculating feeling in your head. Fear of making a wrong move across three businesses and family keeps you defaulting to safe. Argonauts and the explorer work is where that chest feeling lives, but it doesn\'t pay the bills yet.',
    'You push through emotions quickly, turning discomfort into action items rather than sitting with it. Frustration and sadness get analyzed away, and the laptop is your escape hatch — jaw tenses, shoulders tighten, screen opens. This pattern traces back to your father, where emotions were seen as inefficiency. The fear is that if you stop solving, you\'ll face the weight of things you haven\'t processed.',
    'Your body is more vehicle than partner — sleep is the first sacrifice, and your back has been screaming from 10-hour sitting days. Running is the one time body and mind sync, but you\'ve been skipping it for weeks. You\'re running on fumes more than you\'d admit, functioning at a 6 or 7 but not truly vital.',
    'You hold back the messy parts of yourself in conversations. Even with your wife, you perform "I\'ve got this" when you don\'t. Vulnerability feels like a liability — showing doubt might erode others\' confidence. A few close friends from explorer circles are the exception, where masks come off.',
    'Inwedo pays the bills but Argonauts is where meaning lives — building the explorer program and watching people transform. If impact mattered more than income, you\'d go all-in on Argonauts tomorrow. AI Mastermind is your attempt to bridge meaning and commerce.',
    'Values and actions are mostly aligned, but you avoid hard conversations — softening feedback too much. Approval-seeking compromises honesty. There\'s a restructuring conversation you\'ve been postponing for weeks, knowing exactly what needs to happen.',
    'Creativity and curiosity are genuinely alive right now — AI pulls you in constantly, and the pure joy of creation is the drug. You\'ve brought it to the center of your work with Argonauts and AI Mastermind. Admin and operations are what kill the creative energy.',
    'Your days are packed 7am to 11pm with barely any silence. Weekends are recovery, not rest. The fear is that stopping means everything falls apart. Your son is the exception — when you\'re with him, time actually slows down, the closest thing to real spaciousness you have.',
  ][i],
}));

type Phase =
  | 'conversation'
  | 'rating'
  | 'reflection'
  | 'closing'
  | 'dimension-complete';

type JourneyStage = 'welcome' | 'active' | 'synthesis' | 'complete';

export default function JourneyPage() {
  return (
    <Suspense>
      <JourneyContent />
    </Suspense>
  );
}

function JourneyContent() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

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

  // Suggestions state
  const [suggestions, setSuggestions] = useState<{
    lettingGo: string;
    invitingIn: string;
  }>({ lettingGo: '', invitingIn: '' });

  // Synthesis state
  const [synthesisText, setSynthesisText] = useState('');

  // Debug mode: skip to synthesis with pre-filled data
  useEffect(() => {
    if (isDebug && stage === 'welcome') {
      setCompletedDimensions(DEBUG_RESPONSES);
      setCurrentDimIndex(7);
      setStage('synthesis');
      setMessages([]);

      // Trigger synthesis
      (async () => {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            synthesis: true,
            responses: DEBUG_RESPONSES,
          }),
        });
        if (!resp.body) return;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        const msgId = crypto.randomUUID();
        setMessages([{ id: msgId, role: 'assistant', content: '' }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages([{ id: msgId, role: 'assistant', content: full }]);
        }
        setSynthesisText(full);
      })();
    }
  }, [isDebug, stage]);

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
    phase === 'conversation' && userExchanges >= 4 && !isStreaming;

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
            exchangeCount: options.autoStart ? 0 : userExchanges + 1,
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

    // Pre-fetch suggestions while user is picking a rating
    const apiMessages = messages
      .filter((m) => !m.hidden)
      .map((m) => ({ role: m.role, content: m.content }));
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestions: true,
        messages: apiMessages,
        dimensionIndex: currentDimIndex,
      }),
    })
      .then((r) => r.json())
      .then((data) => setSuggestions(data))
      .catch(() => {});
  }

  function handleRate(rating: number) {
    setCurrentRating(rating);
    setPhase('reflection');
  }

  async function handleCompleteReflection() {
    if (!lettingGo.trim() || !invitingIn.trim()) return;

    setPhase('closing');

    const apiMessages = messages
      .filter((m) => !m.hidden)
      .map((m) => ({ role: m.role, content: m.content }));

    // Save dimension response
    const response: DimensionResponse = {
      dimensionId: DIMENSIONS[currentDimIndex].id,
      rating: currentRating,
      lettingGo: lettingGo.trim(),
      invitingIn: invitingIn.trim(),
    };

    const dimId = DIMENSIONS[currentDimIndex].id;

    const newCompleted = [...completedDimensions, response];
    setCompletedDimensions(newCompleted);

    // Fetch conversation summary in background
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summarize: true,
        messages: apiMessages,
        dimensionIndex: currentDimIndex,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setCompletedDimensions((prev) =>
          prev.map((d) =>
            d.dimensionId === dimId
              ? { ...d, conversationSummary: data.summary }
              : d
          )
        );
      })
      .catch(() => {});

    // Get Claude's closing reflection
    await streamFromAPI(apiMessages, {
      closingData: {
        rating: currentRating,
        lettingGo: lettingGo.trim(),
        invitingIn: invitingIn.trim(),
      },
      previousResponses: newCompleted,
    });

    // If last dimension, go straight to synthesis after closing
    if (currentDimIndex >= 7) {
      setStage('synthesis');
      setMessages([]);
      setSynthesisText('');
      const text = await streamFromAPI([], {
        synthesis: true,
        responses: newCompleted,
      });
      setSynthesisText(text);
      return;
    }

    setPhase('dimension-complete');
  }

  async function handleNextDimension() {
    if (currentDimIndex >= 7) {
      // All dimensions complete → synthesis (shouldn't reach here anymore)
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
    setSuggestions({ lettingGo: '', invitingIn: '' });
    setMessages([]);

    // Trigger introduction for next dimension
    await streamFromAPI([], {
      autoStart: true,
      dimensionIndex: nextIndex,
    });
  }

  function handleStartOver() {
    setStage('welcome');
    setCurrentDimIndex(0);
    setCompletedDimensions([]);
    setMessages([]);
    setPhase('conversation');
    setCurrentRating(0);
    setLettingGo('');
    setInvitingIn('');
    setSuggestions({ lettingGo: '', invitingIn: '' });
    setSynthesisText('');
  }

  async function handleDownloadPDF() {
    const { default: jsPDF } = await import('jspdf');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 25;

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('Wheel of Aliveness', pageWidth / 2, y, { align: 'center' });
    y += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(140, 140, 140);
    pdf.text(
      `Completed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 15;

    // Capture wheel as image
    const wheelEl = document.querySelector('[data-wheel-pdf]');
    if (wheelEl) {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(wheelEl as HTMLElement, {
        backgroundColor: '#FFFFFF',
        scale: 3,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        y,
        imgWidth,
        imgHeight
      );
      y += imgHeight + 8;
    }

    // Dimension details
    pdf.setTextColor(45, 42, 38);
    completedDimensions.forEach((d) => {
      const dim = DIMENSIONS.find((dd) => dd.id === d.dimensionId);
      if (!dim) return;

      if (y > 240) {
        pdf.addPage();
        y = 20;
      }

      // Dimension header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(45, 42, 38);
      pdf.text(`${dim.name} — ${d.rating}/10`, margin, y);
      y += 6;

      // Conversation summary
      if (d.conversationSummary) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        const summaryLines = pdf.splitTextToSize(
          d.conversationSummary,
          contentWidth
        );
        pdf.text(summaryLines, margin, y);
        y += summaryLines.length * 4 + 2;
      }

      // Letting go + inviting in
      pdf.setFontSize(8.5);
      pdf.setTextColor(120, 120, 120);
      const lgLines = pdf.splitTextToSize(
        `Letting go: ${d.lettingGo}`,
        contentWidth
      );
      pdf.text(lgLines, margin, y);
      y += lgLines.length * 3.5 + 1;
      const iiLines = pdf.splitTextToSize(
        `Inviting in: ${d.invitingIn}`,
        contentWidth
      );
      pdf.text(iiLines, margin, y);
      y += iiLines.length * 3.5 + 7;
    });

    // Synthesis
    if (synthesisText) {
      if (y > 200) {
        pdf.addPage();
        y = 20;
      }

      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Reflection', margin, y);
      y += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const cleanSynthesis = synthesisText.replace(/\*\*/g, '');
      const synthLines = pdf.splitTextToSize(cleanSynthesis, contentWidth);
      synthLines.forEach((line: string) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, margin, y);
        y += 4.5;
      });
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 180);
    pdf.text(
      'The Argonauts · Explorer Membership · Wheel of Aliveness',
      pageWidth / 2,
      290,
      { align: 'center' }
    );

    pdf.save('wheel-of-aliveness.pdf');
  }

  // ─── Render ──────────────────────────────────────────────────

  if (stage === 'welcome') {
    return <WelcomeScreen onBegin={handleBegin} />;
  }


  // ─── Synthesis page ─────────────────────────────────────────
  if (stage === 'synthesis') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Animated wheel */}
          <motion.div
            data-wheel-pdf
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex justify-center mb-6"
          >
            <WheelVisualization
              ratings={ratings}
              currentDimension={-1}
              size={420}
              showLabels={true}
            />
          </motion.div>

          {/* Synthesis text */}
          {synthesisText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="max-w-xl mx-auto mb-10"
            >
              <div className="text-base leading-relaxed text-foreground space-y-5">
                {synthesisText.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{renderMarkdown(paragraph.trim())}</p>
                ))}
              </div>
            </motion.div>
          )}

          {/* Streaming indicator */}
          {isStreaming && !synthesisText && (
            <div className="flex justify-center py-8">
              <div className="flex gap-1.5">
                <span className="typing-dot w-2 h-2 rounded-full bg-foreground-muted" />
                <span className="typing-dot w-2 h-2 rounded-full bg-foreground-muted" />
                <span className="typing-dot w-2 h-2 rounded-full bg-foreground-muted" />
              </div>
            </div>
          )}

          {/* Actions */}
          {synthesisText && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center space-y-4"
            >
              <p className="text-xs text-foreground-muted">
                Keep this. Come back to it. At the end of your Explorer journey,
                complete it again. The shift might surprise you.
              </p>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PDF
              </button>
              <div>
                <button
                  onClick={handleStartOver}
                  className="text-xs text-foreground-muted hover:text-foreground transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Start a new wheel
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  const currentDimension = DIMENSIONS[currentDimIndex];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header with wheel — sticky */}
      <header className="shrink-0 border-b border-border-light bg-background z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-sm text-foreground-muted">
            Wheel of Aliveness
          </h2>
          <DimensionProgress
            currentIndex={currentDimIndex}
            completedCount={completedDimensions.length}
          />
        </div>

        {/* Wheel — always visible at top */}
        <div data-wheel-pdf className="flex flex-col items-center pb-0 -mt-2 -mb-1 max-h-[420px]">
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
                suggestions={suggestions}
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
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 focus-within:border-primary/50 focus-within:shadow-sm transition-all"
              >
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
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none disabled:opacity-50 min-h-[28px] max-h-[120px] py-1"
                />
                {input.trim() && !isStreaming && (
                  <button
                    type="submit"
                    className="shrink-0 text-primary hover:text-primary-hover transition-colors cursor-pointer"
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
  suggestions,
}: {
  lettingGo: string;
  invitingIn: string;
  onLettingGoChange: (v: string) => void;
  onInvitingInChange: (v: string) => void;
  onComplete: () => void;
  dimensionColor: string;
  suggestions: { lettingGo: string; invitingIn: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 py-4"
    >
      <div>
        <label className="block text-sm text-foreground mb-1">
          What are you ready to let go of?
        </label>
        {suggestions.lettingGo && (
          <p className="text-xs text-foreground-muted italic mb-2">
            Maybe something like: {suggestions.lettingGo}
          </p>
        )}
        <textarea
          value={lettingGo}
          onChange={(e) => onLettingGoChange(e.target.value)}
          placeholder="A mindset, habit, or belief that no longer serves you..."
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm text-foreground mb-1">
          What do you want to invite in?
        </label>
        {suggestions.invitingIn && (
          <p className="text-xs text-foreground-muted italic mb-2">
            Maybe something like: {suggestions.invitingIn}
          </p>
        )}
        <textarea
          value={invitingIn}
          onChange={(e) => onInvitingInChange(e.target.value)}
          placeholder="A feeling, practice, or perspective you want more of..."
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
            <div className="text-base leading-relaxed text-foreground space-y-4">
              {synthesis.split('\n\n').map((paragraph, i) => (
                <p key={i}>{renderMarkdown(paragraph.trim())}</p>
              ))}
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
