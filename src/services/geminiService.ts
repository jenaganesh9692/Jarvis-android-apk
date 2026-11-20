import { AssistantResponse } from '../types';
import { loadCompanionMode } from './visionCompanionService';

export async function sendVoicePrompt(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AssistantResponse> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      conversationHistory: history.slice(-6), // Keep recent turns
      companionMode: loadCompanionMode(),
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Server se sampark karne me takneeki dikkat aayi.');
  }

  return await res.json();
}
