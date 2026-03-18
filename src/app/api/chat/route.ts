import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { buildSystemPrompt, buildSynthesisPrompt } from '@/lib/prompts';
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

  // Regular dimension conversation
  const {
    messages,
    dimensionIndex,
    previousResponses,
    autoStart,
    closingData,
  } = body;

  const systemPrompt = buildSystemPrompt(
    dimensionIndex,
    previousResponses || [],
    autoStart || false,
    closingData
  );

  // For autoStart (dimension introduction), provide a trigger message
  // For closing, provide the reflection data
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
