import { WebDriver, By, until, WebElement } from 'selenium-webdriver';
import { logger } from '../../utils/logger.js';
import { processTranscript } from '../ai/geminiService.js';
import { toggleMicrophone, sendChatMessage, speakInMeeting, enableCaptions } from '../meet/meetService.js';
import { config } from '../../config/index.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { emitTranscriptUpdate, emitBotResponse } from '../server.js';

// Store the conversation segments
let transcriptBuffer: string[] = [];
let lastProcessedIndex = -1;

// For detecting repeated calls to the bot
let lastBotCallTime = 0;
let lastBotCallText = '';
let pendingBotResponse = false;

// For persistent storage of all conversations across sessions
let conversationHistory: Array<{
  sessionId: string;
  timestamp: Date;
  speaker: string;
  text: string;
  type: 'human' | 'bot' | 'bot_proactive';
}> = [];

// Path for persistent storage
const historyFilePath = './data/conversation_history.json';

// Ensure the data directory exists
function ensureDataDirectoryExists() {
  const dataDir = './data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load conversation history from disk
function loadConversationHistory() {
  ensureDataDirectoryExists();
  
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, 'utf-8');
      conversationHistory = JSON.parse(data);
      logger.info(`Loaded ${conversationHistory.length} historical conversation entries`);
    } else {
      logger.info('No existing conversation history found, starting fresh');
      conversationHistory = [];
      // Create an empty history file
      saveConversationHistory();
    }
  } catch (error: any) {
    logger.error('Error loading conversation history', { error: error.message });
    conversationHistory = [];
  }
}

// Save conversation history to disk
function saveConversationHistory() {
  ensureDataDirectoryExists();
  
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(conversationHistory, null, 2), 'utf-8');
    logger.debug(`Saved ${conversationHistory.length} conversation entries to history`);
  } catch (error: any) {
    logger.error('Error saving conversation history', { error: error.message });
  }
}

// Add entry to conversation history
function addToConversationHistory(
  sessionId: string,
  speaker: string,
  text: string,
  type: 'human' | 'bot' | 'bot_proactive'
) {
  // Add to in-memory history
  conversationHistory.push({
    sessionId,
    timestamp: new Date(),
    speaker,
    text,
    type
  });
  
  // Save to disk (we could optimize this to batch saves)
  saveConversationHistory();
}

// Get relevant historical context for a question
function getHistoricalContext(question: string, limit: number = 20): string {
  // Basic implementation - could be improved with semantic search
  // Just returning the most recent entries
  const recentHistory = conversationHistory
    .slice(-limit)
    .map(entry => `[${entry.timestamp.toISOString()}] ${entry.speaker}: ${entry.text}`)
    .join('\n');
  
  return recentHistory;
}

// Session management
type MeetingSession = {
  sessionId: string;
  startTime: Date;
  meetingUrl: string;
  captionCount: number;
  lastActivity: Date;
  isActive: boolean;
  transcriptPath: string;
};

let currentSession: MeetingSession | null = null;

/**
 * Create a new meeting session
 */
function createMeetingSession(meetingUrl: string): MeetingSession {
  const sessionId = uuidv4();
  const startTime = new Date();
  const sessionDir = './sessions';
  
  // Ensure sessions directory exists
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  const transcriptPath = path.join(sessionDir, `meeting_${sessionId}_${startTime.toISOString().replace(/:/g, '-')}.txt`);
  
  const session: MeetingSession = {
    sessionId,
    startTime,
    meetingUrl,
    captionCount: 0,
    lastActivity: startTime,
    isActive: true,
    transcriptPath
  };
  
  // Write session info to file
  fs.writeFileSync(
    transcriptPath, 
    `MEETING SESSION: ${sessionId}\nSTART TIME: ${startTime.toISOString()}\nMEETING URL: ${meetingUrl}\nBOT NAME: ${config.bot.name}\n\n--- TRANSCRIPT ---\n\n`,
    'utf-8'
  );
  
  logger.info('Created new meeting session', { 
    sessionId,
    meetingUrl,
    transcriptPath,
    botName: config.bot.name
  });
  
  return session;
}

/**
 * Start capturing and processing captions from a Google Meet
 * @param driver WebDriver instance with an active meeting
 * @param meetingUrl URL of the current meeting
 */
export async function startTranscriptionCapture(driver: WebDriver, meetingUrl?: string): Promise<void> {
  logger.info('Starting transcription capture');
  
  // Create a new session for this meeting
  currentSession = createMeetingSession(meetingUrl || 'unknown-url');
  
  // Clear any existing transcript
  transcriptBuffer = [];
  lastProcessedIndex = -1;
  
  // Start the caption capture loop
  captureLoop(driver);
}

/**
 * Check if text contains a call to the bot by name
 */
function isBotCalled(text: string): boolean {
  const lowerText = text.toLowerCase();
  const botNameVariations = config.bot.nameVariations();
  
  for (const variation of botNameVariations) {
    if (lowerText.includes(variation)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Continuously check for and capture new captions
 */
async function captureLoop(driver: WebDriver): Promise<void> {
  try {
    let running = true;
    let captionCheckInterval = 500; // Reduced to 500ms for more frequent checking
    let emptyChecks = 0;
    let consecutiveEmptyChecks = 0;
    let resetIndexCounter = 0;
    
    // Main caption capture loop
    while (running && currentSession?.isActive) {
      try {
        // Update session last activity
        if (currentSession) {
          currentSession.lastActivity = new Date();
        }
        
        // Look for the caption container using the provided classes
        const captionsContainerSelectors = [
          '.VYBDae-Bz112c-RLmnJb', // Class provided by user
          '.VbkSUe', // Backup class
          '.a4cQT', // Additional potential caption container 
          '.Gd5uUe' // Another potential caption container
        ];
        
        let captionsContainer: WebElement | null = null;
        for (const selector of captionsContainerSelectors) {
          const containers = await driver.findElements(By.css(selector));
          if (containers.length > 0) {
            captionsContainer = containers[0];
            break;
          }
        }
        
        if (captionsContainer) {
          // Reset empty checks counter
          emptyChecks = 0;
          consecutiveEmptyChecks = 0;
          
          // Get all caption elements - try different possible selectors for captions
          const captionSelectors = [
            '.knvuYc', // Original selector
            '.PTpbA', // Alternative selector 1
            '.FwVlPe', // Alternative selector 2 
            '.caption-text', // Generic possibility
            'div[jsname="tgaKEf"]', // Another possibility based on jsname attribute
            '.cZFgx', // Additional potential caption element
            '.U1EB4d', // Another potential caption element
            'div[jsname="GG25db"]' // Another jsname-based selector
          ];
          
          let captionElements: WebElement[] = [];
          for (const selector of captionSelectors) {
            const elements = await driver.findElements(By.css(selector));
            if (elements.length > 0) {
              captionElements = elements;
              logger.debug(`Found ${elements.length} caption elements with selector: ${selector}`);
              break;
            }
          }
          
          // Process new caption elements
          if (captionElements.length > 0) {
            logger.debug(`Processing ${captionElements.length} caption elements, lastProcessedIndex: ${lastProcessedIndex}`);
            
            // If we have more captions than our last processed index,
            // or we've gone through several iterations without finding new captions,
            // reset the index to ensure we don't miss captions
            if (captionElements.length <= lastProcessedIndex || resetIndexCounter >= 20) {
              lastProcessedIndex = -1; // Reset to process all captions
              resetIndexCounter = 0;
              logger.debug("Reset lastProcessedIndex to capture all captions");
            } else {
              resetIndexCounter++;
            }
            
            for (let i = 0; i < captionElements.length; i++) {
              if (i > lastProcessedIndex) {
                // Try different selectors for speaker and text elements
                const speakerSelectors = [
                  '.zs7s8d', 
                  '.YTbUzc', 
                  'span[jsname="YS6Lbf"]', 
                  '.Yrbpuc', 
                  '.jKgOwe'
                ];
                
                const textSelectors = [
                  '.iTTPOb', 
                  '.ZYJ9qd', 
                  'span[jsname="Rn3fGf"]', 
                  '.ztKZ3d', 
                  '.vwnVl'
                ];
                
                let speakerText: string | null = null;
                let captionText: string | null = null;
                
                // Try to find speaker name
                for (const selector of speakerSelectors) {
                  const elements = await captionElements[i].findElements(By.css(selector));
                  if (elements.length > 0) {
                    speakerText = await elements[0].getText();
                    if (speakerText) break;
                  }
                }
                
                // Try to find caption text
                for (const selector of textSelectors) {
                  const elements = await captionElements[i].findElements(By.css(selector));
                  if (elements.length > 0) {
                    captionText = await elements[0].getText();
                    if (captionText) break;
                  }
                }
                
                // If both speaker and text were not found, try getting the full text
                if (!speakerText || !captionText) {
                  const fullText = await captionElements[i].getText();
                  if (fullText) {
                    // Try to split by colon to separate speaker and text
                    const parts = fullText.split(':');
                    if (parts.length >= 2) {
                      speakerText = parts[0].trim();
                      captionText = parts.slice(1).join(':').trim();
                    } else {
                      // Just use the whole text as caption
                      captionText = fullText;
                      speakerText = 'Unknown Speaker';
                    }
                  }
                }
                
                if (speakerText && captionText) {
                  const timestamp = new Date().toISOString();
                  const formattedCaption = `[${timestamp}] ${speakerText}: ${captionText}`;
                  
                  transcriptBuffer.push(formattedCaption);
                  
                  // Update session information
                  if (currentSession) {
                    currentSession.captionCount++;
                    
                    // Log to session transcript file
                    fs.appendFileSync(currentSession.transcriptPath, formattedCaption + '\n', 'utf-8');
                    
                    // Add to persistent conversation history
                    addToConversationHistory(
                      currentSession.sessionId,
                      speakerText,
                      captionText,
                      'human'
                    );
                    
                    // Emit real-time update via WebSocket
                    emitTranscriptUpdate(captionText, speakerText);
                  }
                  
                  // Log the caption to console
                  logger.info('CAPTION', { speaker: speakerText, text: captionText, timestamp });
                  
                  // Check if bot was called
                  if (speakerText !== config.bot.name && isBotCalled(captionText)) {
                    const now = Date.now();
                    // Prevent duplicate reactions to the same message
                    if (now - lastBotCallTime > 5000 || captionText !== lastBotCallText) {
                      lastBotCallTime = now;
                      lastBotCallText = captionText;
                      logger.info('BOT CALLED', { text: captionText });
                      
                      // Don't process if already waiting for a response
                      if (!pendingBotResponse) {
                        pendingBotResponse = true;
                        processBotCall(driver, speakerText, captionText);
                      }
                    }
                  }
                  
                  lastProcessedIndex = i;
                }
              }
            }
            
            // Process with AI when we have enough content (every 10 messages)
            if (transcriptBuffer.length > 0 && transcriptBuffer.length % 10 === 0 && !pendingBotResponse) {
              processBufferedTranscript(driver);
            }
          } else {
            emptyChecks++;
            consecutiveEmptyChecks++;
            logger.debug('No caption elements found in this check');
          }
        } else {
          emptyChecks++;
          consecutiveEmptyChecks++;
          logger.debug('No caption container found in this check');
          
          // If we've had several consecutive empty checks, try enabling captions again
          if (consecutiveEmptyChecks > 10) { // After ~5 seconds of no captions
            logger.warn('No captions detected for 5 seconds, attempting to re-enable captions');
            try {
              await enableCaptions(driver);
              logger.info('Re-enabled captions');
            } catch (error: any) {
              logger.error('Failed to re-enable captions', { error: error.message });
            }
            consecutiveEmptyChecks = 0;
          }
        }
      } catch (error: any) {
        logger.error('Error capturing captions', { error: error.message });
      }
      
      // Dynamic interval adjustment - if we're getting captions, check more frequently
      if (emptyChecks > 5) {
        captionCheckInterval = 1000; // 1 second if not finding captions
      } else {
        captionCheckInterval = 500; // 500ms when actively capturing
      }
      
      // Wait before next capture attempt
      await new Promise(resolve => setTimeout(resolve, captionCheckInterval));
    }
    
    logger.info('Caption capture loop ended', { 
      sessionActive: currentSession?.isActive || false
    });
    
  } catch (error: any) {
    logger.error('Caption capture loop failed', { error: error.message });
    throw error;
  }
}

/**
 * Process a call to the bot and generate a response
 */
async function processBotCall(driver: WebDriver, speaker: string, text: string): Promise<void> {
  try {
    logger.info('Processing bot call', { speaker, text });
    
    // Extract the question (remove bot name)
    let question = text;
    const botNameVariations = config.bot.nameVariations();
    for (const variation of botNameVariations) {
      if (question.toLowerCase().includes(variation)) {
        // Remove the name from the text to get just the question
        question = question.toLowerCase().replace(variation, '').trim();
        // Remove any leading punctuation
        question = question.replace(/^[,.:;?!]+\s*/g, '');
        break;
      }
    }
    
    // If there's no actual question after removing the bot name, use a default
    if (!question) {
      question = "Can you provide a summary of the current meeting?";
    }
    
    // Prepare context for the AI - include both recent transcript and historical context
    const recentContext = transcriptBuffer.slice(-15).join('\n'); // Last 15 messages for recent context
    const historicalContext = getHistoricalContext(question, 20); // Get relevant historical context
    
    // Prepare prompt for the AI
    const prompt = `
You are ${config.bot.name}, an AI assistant in a Google Meet meeting.

RECENT CONVERSATION CONTEXT:
${recentContext}

HISTORICAL CONTEXT (may be relevant):
${historicalContext}

SPEAKER: ${speaker}
QUESTION: ${question}

Please provide a helpful, concise response to this question based on both the recent meeting context
and any relevant historical context from previous conversations.
Your response should be in a conversational tone, suitable for speaking aloud in a meeting.
Keep your response relatively brief (1-3 sentences if possible) and directly address the question.
`;

    // Process with AI
    const response = await processTranscript(prompt);
    logger.info('BOT RESPONSE GENERATED', { question, response });
    
    // Log to session file
    if (currentSession) {
      const timestamp = new Date().toISOString();
      const formattedResponse = `[${timestamp}] ${config.bot.name} (AI): ${response}`;
      fs.appendFileSync(currentSession.transcriptPath, formattedResponse + '\n', 'utf-8');
      
      // Add to transcript buffer
      transcriptBuffer.push(formattedResponse);
      
      // Add to persistent conversation history
      addToConversationHistory(
        currentSession.sessionId,
        config.bot.name,
        response,
        'bot'
      );
      
      // Emit bot response via WebSocket
      emitBotResponse(response);
    }
    
    // Speak the response if configured to do so
    if (config.bot.speakResponses) {
      await speakInMeeting(driver, response);
    } else {
      // Otherwise just send as chat message
      await sendChatMessage(driver, response);
    }
  } catch (error: any) {
    logger.error('Error processing bot call', { error: error.message });
  } finally {
    // Reset pending flag
    pendingBotResponse = false;
  }
}

/**
 * Process the current transcript buffer with the AI
 */
async function processBufferedTranscript(driver: WebDriver): Promise<void> {
  try {
    if (transcriptBuffer.length === 0) return;
    
    const transcript = transcriptBuffer.join('\n');
    logger.info('Processing transcript buffer', { length: transcript.length });
    
    // Send to AI for processing
    const analysis = await processTranscript(transcript);
    
    // Log the AI analysis
    logger.info('----- MEETING ANALYSIS -----');
    logger.info(analysis);
    logger.info('---------------------------');
    
    // Save analysis to session file if we have a session
    if (currentSession) {
      fs.appendFileSync(
        currentSession.transcriptPath, 
        `\n\n----- AI ANALYSIS (${new Date().toISOString()}) -----\n${analysis}\n-----------------------------\n\n`,
        'utf-8'
      );
    }
    
    // Check if analysis suggests bot should respond proactively
    if (shouldBotRespond(analysis) && !pendingBotResponse) {
      pendingBotResponse = true;
      await handleProactiveResponse(driver, analysis);
    }
    
  } catch (error: any) {
    logger.error('Error processing transcript', { error: error.message });
  }
}

/**
 * Determine if the bot should respond proactively based on analysis
 */
function shouldBotRespond(analysis: string): boolean {
  // Check analysis for indicators that the bot should respond
  const keywords = [
    'urgent',
    'important question',
    'needs clarification',
    'decision required',
    'agreement needed',
    'critical issue',
    'blocking problem',
    'attention required'
  ];
  
  const lowerAnalysis = analysis.toLowerCase();
  
  // Check if any keywords are present
  for (const keyword of keywords) {
    if (lowerAnalysis.includes(keyword)) {
      // Use response threshold to determine if we should respond
      return Math.random() < config.bot.responseThreshold;
    }
  }
  
  return false;
}

/**
 * Handle proactive response from the bot
 */
async function handleProactiveResponse(driver: WebDriver, analysis: string): Promise<void> {
  try {
    // Include historical context in the prompt
    const historicalContext = getHistoricalContext("", 10);
    
    const prompt = `
You are ${config.bot.name}, an AI assistant in a Google Meet meeting.

MEETING ANALYSIS:
${analysis}

HISTORICAL CONTEXT:
${historicalContext}

Based on this meeting analysis and any relevant historical context, craft a short, helpful interjection 
that would be appropriate to say in the meeting right now. This should be something that adds value 
to the conversation, such as summarizing a key point, clarifying something confusing, or helping 
move the discussion forward.

Keep your interjection under 3 sentences and make it conversational. Start with a polite opener
like "If I may add something..." or "Just to clarify...".
`;

    // Generate proactive response
    const response = await processTranscript(prompt);
    logger.info('BOT PROACTIVE RESPONSE', { response });
    
    // Log to session file
    if (currentSession) {
      const timestamp = new Date().toISOString();
      const formattedResponse = `[${timestamp}] ${config.bot.name} (AI PROACTIVE): ${response}`;
      fs.appendFileSync(currentSession.transcriptPath, formattedResponse + '\n', 'utf-8');
      
      // Add to transcript buffer
      transcriptBuffer.push(formattedResponse);
      
      // Add to persistent conversation history
      addToConversationHistory(
        currentSession.sessionId,
        config.bot.name,
        response,
        'bot_proactive'
      );
      
      // Emit bot response via WebSocket
      emitBotResponse(response);
    }
    
    // Send the response
    if (config.bot.speakResponses) {
      await speakInMeeting(driver, response);
    } else {
      await sendChatMessage(driver, response);
    }
  } catch (error: any) {
    logger.error('Error generating proactive response', { error: error.message });
  } finally {
    pendingBotResponse = false;
  }
}

/**
 * Get the current transcript
 */
export function getCurrentTranscript(): string {
  return transcriptBuffer.join('\n');
}

/**
 * Get the current session information
 */
export function getCurrentSession(): MeetingSession | null {
  return currentSession;
}

/**
 * End the current session
 */
export function endSession(): void {
  if (currentSession) {
    currentSession.isActive = false;
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - currentSession.startTime.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationSeconds = Math.floor((durationMs % 60000) / 1000);
    
    logger.info('Ending meeting session', {
      sessionId: currentSession.sessionId,
      duration: `${durationMinutes}m ${durationSeconds}s`,
      captionCount: currentSession.captionCount
    });
    
    // Add session end information to transcript file
    fs.appendFileSync(
      currentSession.transcriptPath,
      `\n\n--- SESSION ENDED ---\nEND TIME: ${endTime.toISOString()}\nDURATION: ${durationMinutes}m ${durationSeconds}s\nCAPTION COUNT: ${currentSession.captionCount}\n`,
      'utf-8'
    );
  }
}

/**
 * Clear the transcript buffer
 */
export function clearTranscript(): void {
  transcriptBuffer = [];
  lastProcessedIndex = -1;
  logger.info('Transcript buffer cleared');
}

// Initialize by loading history
loadConversationHistory(); 