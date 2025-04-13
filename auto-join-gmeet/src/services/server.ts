import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { getCurrentTranscript, clearTranscript, endSession } from './transcription/transcriptionService.js';
import { processTranscript } from './ai/geminiService.js';
import { getDriver, joinMeeting, leaveMeeting } from './meet/meetService.js';
import { startTranscriptionCapture } from './transcription/transcriptionService.js';
import { WebDriver } from 'selenium-webdriver';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import fs from 'fs';

// Setup for ESM dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track driver instance for meetings
let driver: WebDriver | null = null;
let isInMeeting = false;

logger.info('Server', 'Initializing server');

// Store persona configuration
let personaConfig = {
  name: "Surya Ghosh",
  title: "The Passionate Tech Explorer",
  education: {
    degree: "B.Tech in Electronics and Communication Engineering",
    year: "3rd Year, 6th Semester",
    institution: "Future Institute of Engineering and Management"
  },
  traits: ["Curious", "passionate", "disciplined", "hardworking", "socially active"],
  technical: {
    languages: ["Java", "C"],
    webStack: ["React", "Next.js", "Hono.js", "Drizzle ORM", "MongoDB"],
    projects: [
      "Women Safety App (gender classification + SMS alerts)",
      "CloneX – AI-powered digital human clone",
      "Obstacle Avoiding Robot",
      "Firefighting Robot with separate sensing unit",
      "ReelsPro – Media sharing Next.js app",
      "Astro.js based documentation site with login and backend",
      "Chat + Music Sync App"
    ]
  },
  personality: {
    style: "Goal-oriented, practical, and project-driven learner with a love for real-world applications",
    interests: [
      "Artificial Intelligence & Deep Learning",
      "Robotics",
      "Full Stack Web Development",
      "Hackathons & Competitive Coding",
      "Building tech for social good"
    ],
    goals: [
      "Revise and strengthen DSA, Java, and C fundamentals",
      "Build a successful hackathon project (April 12–13)",
      "Contribute daily to research work",
      "Maintain consistency despite distractions",
      "Balance academics, project work, and personal life"
    ]
  }
};

// Serve static files
app.use(express.static(path.join(__dirname, '../../public')));

// Get home page
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Update persona configuration endpoint
app.post('/update-persona', async (req: Request, res: Response) => {
  logger.info('Server', 'Updating persona configuration');
  try {
    const newConfig = req.body;
    personaConfig = { ...personaConfig, ...newConfig };
    logger.info('Server', 'Persona updated successfully', { name: personaConfig.name });
    res.json({ 
      success: true, 
      message: 'Persona updated successfully',
      config: personaConfig 
    });
  } catch (error: any) {
    logger.error('Server', 'Persona Update Error', { error: error.message });
    res.status(500).send('Error updating persona configuration');
  }
});

// Get current persona configuration
app.get('/persona-config', (req: Request, res: Response) => {
  logger.debug('Server', 'Fetching persona configuration');
  res.json(personaConfig);
});

// AI chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  logger.info('Server', 'Processing AI chat request');
  try {
    const prompt = req.body.prompt;
    logger.debug('Server', 'Generating content', { promptLength: prompt.length });
    
    const text = await processTranscript(prompt);
    
    logger.info('Server', 'AI response generated successfully', { responseLength: text.length });
    res.json({ text });
  } catch (error: any) {
    logger.error('Server', 'AI Error', { error: error.message });
    res.status(500).send('Error processing your request');
  }
});

// Get current transcript
app.get('/api/transcript', (req: Request, res: Response) => {
  const transcript = getCurrentTranscript();
  res.json({ transcript });
});

// Clear transcript
app.post('/api/transcript/clear', (req: Request, res: Response) => {
  clearTranscript();
  res.json({ success: true, message: 'Transcript cleared' });
});

// Check server status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    inMeeting: isInMeeting,
    botName: config.bot.name
  });
});

// Socket event handlers
io.on('connection', (socket: Socket) => {
  logger.info('Socket connected:', { socketId: socket.id });
  
  // Send current status to newly connected client
  socket.emit('status', { 
    inMeeting: isInMeeting, 
    botName: config.bot.name,
    transcript: getCurrentTranscript()
  });
  
  // Handle client requesting transcript
  socket.on('get_transcript', () => {
    socket.emit('transcript', { text: getCurrentTranscript() });
  });
  
  // Handle client requesting to join meeting
  socket.on('join_meeting', async (data: { url?: string }) => {
    try {
      if (!data.url) {
        socket.emit('error', { message: 'Meeting URL is required' });
        return;
      }
      
      // Call the existing join meeting function
      await handleJoinMeeting(data.url);
      socket.emit('meeting_joined', { url: data.url });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle client requesting to leave meeting
  socket.on('leave_meeting', async () => {
    try {
      await handleLeaveMeeting();
      socket.emit('meeting_left');
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', { socketId: socket.id });
  });
});

// Create a custom event emitter for transcription updates
export const emitTranscriptUpdate = (text: string, speaker: string) => {
  io.emit('transcript_update', { text, speaker, timestamp: new Date().toISOString() });
};

export const emitBotResponse = (response: string) => {
  io.emit('bot_response', { 
    text: response, 
    botName: config.bot.name, 
    timestamp: new Date().toISOString() 
  });
};

// Join meeting handler
async function handleJoinMeeting(meetingUrl: string): Promise<void> {
  try {
    // If already in a meeting, leave first
    if (isInMeeting && driver) {
      await handleLeaveMeeting();
    }
    
    // Get new WebDriver
    driver = await getDriver();
    
    // Join the meeting
    await joinMeeting(driver, meetingUrl, config.meet.defaultUsername);
    isInMeeting = true;
    
    // Start capturing captions
    await startTranscriptionCapture(driver, meetingUrl);
    
    // Broadcast status update to all clients
    io.emit('status', { inMeeting: true, meetingUrl });
    
    logger.info('Joined meeting successfully', { url: meetingUrl });
  } catch (error: any) {
    logger.error('Failed to join meeting', { error: error.message });
    
    // Attempt to clean up
    if (driver) {
      await driver.quit().catch(() => {});
      driver = null;
    }
    
    isInMeeting = false;
    throw error;
  }
}

// Leave meeting handler
async function handleLeaveMeeting(): Promise<void> {
  try {
    if (!isInMeeting || !driver) {
      return;
    }
    
    // End the transcript session
    endSession();
    
    // Leave the meeting
    await leaveMeeting(driver);
    
    // Close the browser
    await driver.quit();
    driver = null;
    isInMeeting = false;
    
    // Broadcast status update to all clients
    io.emit('status', { inMeeting: false });
    
    logger.info('Left meeting successfully');
  } catch (error: any) {
    logger.error('Error leaving meeting', { error: error.message });
    
    // Force cleanup
    if (driver) {
      await driver.quit().catch(() => {});
      driver = null;
    }
    
    isInMeeting = false;
    throw error;
  }
}

// Start server function
export function startServer(): void {
  server.listen(config.server.port, () => {
    logger.info('Server', `Server running at http://localhost:${config.server.port}`);
    logger.info('Server', 'Using bot name:', { botName: config.bot.name });
    logger.info('Server', 'Available endpoints:', {
      endpoints: [
        'GET / : Main interface',
        'GET /api/transcript : Get current meeting transcript',
        'POST /api/transcript/clear : Clear the transcript buffer',
        'POST /api/chat : Chat endpoint',
        'GET /api/status : Check server status',
        'POST /api/join-meeting : Join a Google Meet meeting',
        'POST /api/leave-meeting : Leave the current meeting',
        'GET /persona-config : Get current persona',
        'POST /update-persona : Update persona configuration',
        'WebSocket: Real-time communication'
      ]
    });
  });
} 