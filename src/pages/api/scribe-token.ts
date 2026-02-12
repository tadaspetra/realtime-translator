import type { APIRoute } from 'astro';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export const prerender = false;

const json = (status: number, payload: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });

export const POST: APIRoute = async () => {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return json(500, { error: 'ELEVENLABS_API_KEY is not configured on the server.' });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });
    const tokenResponse = await client.tokens.singleUse.create('realtime_scribe');

    if (!tokenResponse.token) {
      return json(500, { error: 'ElevenLabs did not return a token.' });
    }

    return json(200, { token: tokenResponse.token });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate a single-use token.';
    return json(500, { error: message });
  }
};
