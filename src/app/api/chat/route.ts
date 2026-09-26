import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText } from 'ai';
import {
  buildSystemPrompt,
  buildSynthesisPrompt,
  buildSuggestionsPrompt,
  buildConversationSummaryPrompt,
} from '@/lib/prompts';
import { DimensionResponse } from '@/lib/types';

// Sonnet 5 (migracja z Sonnet 4.6, 25.09.2026). Sonnet 5 domyslnie mysli; wylaczamy to jawnie,
// zeby zachowac dotychczasowe zachowanie (4.6 bez myslenia). @ai-sdk/anthropic 3.0.58 nie zna
// jeszcze tego ID i bez maxOutputTokens przyjalby 4096 zamiast dawnego limitu modelu, stad jawny
// limit. Nie dodawaj temperature/topP/topK ani budgetTokens — Sonnet 5 odpowiada na nie 400.
const MODEL = anthropic('claude-sonnet-5');
const MODEL_OPTIONS = {
  maxOutputTokens: 16000,
  providerOptions: { anthropic: { thinking: { type: 'disabled' as const } } },
};

export async function POST(req: Request) {
  const body = await req.json();

  // Synthesis mode — after all 8 dimensions
  if (body.synthesis) {
    const responses: DimensionResponse[] = body.responses;
    const result = streamText({
      model: MODEL,
      ...MODEL_OPTIONS,
      system: buildSynthesisPrompt(responses),
      messages: [
        {
          role: 'user',
          content: 'Please share your synthesis of my Wheel of Aliveness.',
        },
      ],
    });
    return result.toTextStreamResponse();
  }

  // Suggestions mode — generate personalized letting go / inviting in
  // Conversation summary mode
  if (body.summarize) {
    try {
      const { messages, dimensionIndex } = body;
      const filtered = (messages || [])
        .filter((m: { content: string }) => m.content && m.content.trim())
        .map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      if (filtered.length > 0 && filtered[filtered.length - 1].role === 'assistant') {
        filtered.push({ role: 'user' as const, content: 'Please summarize our conversation.' });
      }
      const result = await generateText({
        model: MODEL,
        ...MODEL_OPTIONS,
        system: buildConversationSummaryPrompt(dimensionIndex),
        messages: filtered,
      });
      return Response.json({ summary: result.text });
    } catch {
      return Response.json({ summary: '' });
    }
  }

  if (body.suggestions) {
    try {
      const { messages, dimensionIndex } = body;
      const filteredMessages = (messages || [])
        .filter((m: { content: string }) => m.content && m.content.trim())
        .map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      if (filteredMessages.length === 0) {
        return Response.json({ lettingGo: '', invitingIn: '' });
      }

      // Ensure conversation ends with a user message (API requirement)
      if (filteredMessages[filteredMessages.length - 1].role === 'assistant') {
        filteredMessages.push({
          role: 'user' as const,
          content: 'Based on our conversation, what do you suggest?',
        });
      }

      const result = await generateText({
        model: MODEL,
        ...MODEL_OPTIONS,
        system: buildSuggestionsPrompt(dimensionIndex),
        messages: filteredMessages,
      });
      return Response.json(JSON.parse(result.text));
    } catch (e) {
      console.error('[suggestions] error:', e);
      return Response.json({ lettingGo: '', invitingIn: '' });
    }
  }

  // Regular dimension conversation
  const {
    messages,
    dimensionIndex,
    previousResponses,
    rating,
    ratingStart,
    closingData,
    exchangeCount,
  } = body;

  const systemPrompt = buildSystemPrompt(
    dimensionIndex,
    previousResponses || [],
    rating || 5,
    closingData,
    exchangeCount || 0
  );

  const apiMessages =
    ratingStart || closingData
      ? [
          {
            role: 'user' as const,
            content: closingData
              ? `My rating: ${closingData.rating}/10. What I'm letting go of: "${closingData.lettingGo}". What I'm inviting in: "${closingData.invitingIn}".`
              : `I rated this ${rating}/10.`,
          },
        ]
      : (messages || []).map(
          (m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })
        );

  const result = streamText({
    model: MODEL,
    ...MODEL_OPTIONS,
    system: systemPrompt,
    messages: apiMessages,
  });

  return result.toTextStreamResponse();
}
