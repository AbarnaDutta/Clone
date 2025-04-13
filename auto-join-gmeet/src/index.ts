import { WebDriver } from 'selenium-webdriver';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { startServer } from './services/server.js';
import { getDriver, joinMeeting, enableCaptions } from './services/meet/meetService.js';
import { startTranscriptionCapture, clearTranscript, endSession } from './services/transcription/transcriptionService.js';

// Store the WebDriver instance
let driver: WebDriver | null = null;

/**
 * Start the application server
 */
async function startApp() {
  logger.info('Starting application');
  
  // Start the HTTP server
  startServer();
  
  // Check if we have a meeting URL to join
  if (config.meet.defaultMeetingUrl) {
    try {
      await joinMeetingAndCapture(config.meet.defaultMeetingUrl);
    } catch (error: any) {
      logger.error('Failed to join meeting', { error: error.message });
    }
  } else {
    logger.info('No meeting URL provided, server started in standalone mode');
    logger.info('Set MEETING_URL environment variable to auto-join a meeting');
  }
}

/**
 * Join a meeting and start capturing transcript
 */
async function joinMeetingAndCapture(meetingUrl: string): Promise<void> {
  try {
    logger.info('Initializing browser for Google Meet');
    
    // Get WebDriver
    driver = await getDriver();
    
    // Join the meeting
    await joinMeeting(driver, meetingUrl);
    logger.info('Successfully joined the meeting');
    
    // Enable captions to capture conversation
    await enableCaptions(driver);
    logger.info('Captions enabled for transcription');
    
    // Start capturing and processing transcript - pass the meeting URL
    await startTranscriptionCapture(driver, meetingUrl);
  } catch (error: any) {
    logger.error('Failed to join meeting or start capture', { error: error.message });
    throw error;
  }
}

/**
 * Clean up resources on application exit
 */
function cleanup() {
  logger.info('Cleaning up resources');
  
  // End the current meeting session
  try {
    endSession();
    logger.info('Meeting session ended');
  } catch (err: any) {
    logger.error('Error ending meeting session', { error: err.message });
  }
  
  if (driver) {
    logger.info('Closing browser');
    driver.quit().catch((err: any) => {
      logger.error('Error closing browser', { error: err.message });
    });
  }
}

// Handle application shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down');
  cleanup();
  process.exit(0);
});

// Start the application
startApp().catch((error: any) => {
  logger.error('Application startup failed', { error: error.message });
  process.exit(1);
});
