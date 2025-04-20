# Google Meet Auto-Join Bot

A smart, interactive bot that can join Google Meet sessions, transcribe conversations, and participate in conversations when needed. Powered by Selenium WebDriver and Gemini AI, this bot can listen to meeting discussions, capture captions, process them with AI, and interact when called upon.

## Features

- Automatically join Google Meet sessions
- Capture and process meeting captions in real-time
- Respond when its name is called
- Toggle microphone to speak responses when needed
- Process transcript with AI for intelligent responses
- Proactively identify important topics needing clarification
- Expose a simple API for controlling the bot
- Log all conversation and analysis for later review

## How It Works

1. The bot joins a Google Meet session using Selenium WebDriver
2. It listens for captions and processes them in real-time
3. When called by its name, it processes any requests using Gemini AI
4. It can respond via chat or by toggling the microphone
5. All conversation and analysis are logged to session files

## Requirements

- Node.js (v16+)
- npm or yarn
- Chrome or Chromium browser
- Gemini AI key

## Quick Start

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/auto-join-gmeet.git
   cd auto-join-gmeet
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure environment variables**
   - Create a `.env` file based on the example below:
   ```
   # Server configuration
   PORT=3000
   HOST=localhost

   # Google Meet configuration
   MEETING_URL=https://meet.google.com/your-meeting-code
   USERNAME=Meeting Bot
   BOT_NAME=Assistant

   # Gemini AI configuration
   GEMINI_API_KEY=your-gemini-api-key-here

   # Bot behavior
   RESPONSE_THRESHOLD=0.7
   SPEAK_RESPONSES=true

   # Logging level (debug, info, warn, error)
   LOG_LEVEL=info
   ```

4. **Start the bot**
   ```
   npm run dev
   ```

5. **Control the bot using the API**
   - Join meeting: `POST http://localhost:3000/api/join-meeting`
   - Check status: `GET http://localhost:3000/api/status`
   - Leave meeting: `POST http://localhost:3000/api/leave-meeting`

## Interacting with the Bot

During a meeting, you can call the bot by its name (default is "Assistant") followed by your question or request:

- "Assistant, can you summarize what we've discussed so far?"
- "Assistant, what time is the next meeting scheduled for?"
- "Assistant, remind us about the project deadline"

The bot will listen for its name and respond either via chat or by speaking through its microphone, depending on the configuration.

## Session Files

Each meeting creates a session directory with the following files:
- `transcript.txt`: Full meeting transcript
- `analysis.json`: AI analysis of the conversation
- `bot_interactions.log`: Record of when the bot was called and how it responded
- `metadata.json`: Meeting details including participants and timing

## API Reference

- `GET /api/status`: Get the current status of the bot
- `POST /api/join-meeting`: Join a Google Meet session
- `POST /api/leave-meeting`: Leave the current meeting
- `GET /api/transcript`: Get the current meeting transcript

## Development

```
npm run build    # Build the project
npm run dev      # Start with hot-reloading
npm run lint     # Run linter
npm run test     # Run tests
```

## License

MIT

## Project Structure

```
src/
├── config/           # Configuration files
├── services/
│   ├── ai/           # Gemini AI integration
│   ├── meet/         # Google Meet browser automation
│   ├── transcription/# Caption capture and processing
│   └── server.ts     # Express server for web interface
├── utils/            # Utility functions
└── index.ts          # Main application entry point
```

## Disclaimer

This tool is for educational purposes only. Please use responsibly and respect privacy policies of Google Meet. 