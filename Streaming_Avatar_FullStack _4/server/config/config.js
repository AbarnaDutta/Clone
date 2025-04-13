import dotenv from 'dotenv';
dotenv.config();

export const config = {
  heygen: {
    apiKey: process.env.HEYGEN_APIKEY,
    serverUrl: process.env.HEYGEN_SERVER_URL,
    defaultQuality: 'low',
  },
  gemini: {
    apiKey: process.env.GEMINI_APIKEY || 'AIzaSyCw9rwFrp0Rbw1ZqYkyZyAUNTyHCMXxQKk',
    model: 'gemini-2.0-flash',
    config: {
      temperature: 0.9,
      topP: 0.1,
      topK: 16,
      maxOutputTokens: 2048,
      candidateCount: 1,
      stopSequences: [],
    },
  },
};
