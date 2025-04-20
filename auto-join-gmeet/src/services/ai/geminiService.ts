import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({
  model: config.gemini.model,
  generationConfig: config.gemini.config
});

logger.info('Gemini AI model initialized', { model: config.gemini.model });

/**
 * Process a transcript segment with Gemini AI
 * @param transcript The meeting transcript segment
 * @param context Additional context (optional)
 * @returns AI-generated response
 */
export async function processTranscript(transcript: string, context?: string): Promise<string> {
  try {
    const prompt = buildPrompt(transcript, context);
    logger.debug('Generating AI content', { promptLength: prompt.length });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    logger.info('AI response generated', { responseLength: text.length });
    return text;
  } catch (error: any) {
    logger.error('AI Error', { error: error.message });
    throw new Error(`Error processing transcript: ${error.message}`);
  }
}

/**
 * Build a prompt for the AI model
 */
function buildPrompt(transcript: string, context?: string): string {
  return `
You are an AI assistant analyzing a Google Meet conversation.

MEETING TRANSCRIPT:
${transcript}

${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

Please analyze this conversation and provide:
1. Summary of key points discussed
2. Action items mentioned
3. Any decisions made
4. Questions that were asked but not clearly answered

Format your response in a clear, organized way.
`;
} 