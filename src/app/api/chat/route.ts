import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText } from 'ai';
import {
  buildSystemPrompt,
  buildSynthesisPrompt,
  buildSuggestionsPrompt,
  buildConversationSummaryPrompt,
} from '@/lib/prompts';
import { DimensionResponse } from '@/lib/types';

export async function POST(req: Request) {
  const body = await req.json();

  // Synthesis mode — after all 8 dimensions
  if (body.synthesis) {
    const responses: DimensionResponse[] = body.responses;
    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
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
    const { messages, dimensionIndex } = body;
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: buildConversationSummaryPrompt(dimensionIndex),
      messages: (messages || []).map(
        (m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })
      ),
    });
    return Response.json({ summary: result.text });
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

      const result = await generateText({
        model: anthropic('claude-sonnet-4-6'),
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
    autoStart,
    closingData,
    exchangeCount,
  } = body;

  const systemPrompt = buildSystemPrompt(
    dimensionIndex,
    previousResponses || [],
    autoStart || false,
    closingData,
    exchangeCount || 0
  );

  const apiMessages =
    autoStart || closingData
      ? [
          {
            role: 'user' as const,
            content: closingData
              ? `My rating: ${closingData.rating}/10. What I'm letting go of: "${closingData.lettingGo}". What I'm inviting in: "${closingData.invitingIn}".`
              : 'Please begin.',
          },
        ]
      : (messages || []).map(
          (m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })
        );

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages: apiMessages,
  });

  return result.toTextStreamResponse();
}
