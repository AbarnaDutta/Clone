# Avatar UI Application

A React application built with Vite, Tailwind CSS, and shadcn/ui components that connects to a backend server.

## Features

- Persona configuration management
- AI chat integration with Gemini AI
- Avatar control interface
- Video display capability
- Background removal toggle

## Technologies Used

- Frontend:
  - React with TypeScript
  - Vite for build tooling
  - Tailwind CSS for styling
  - Client-side rendering

- Backend:
  - Express.js server
  - Gemini AI integration

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the root directory with:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     PORT=3000
     ```

4. Run development server:
   ```
   npm run dev
   ```

5. Build and start the production server:
   ```
   npm start
   ```

## Available Scripts

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the application for production
- `npm run server` - Run the backend server only
- `npm start` - Build and run the full application in production mode

## API Endpoints

- `GET /persona-config` - Get the current persona configuration
- `POST /update-persona` - Update the persona configuration
- `POST /openai/complete` - Send a prompt to the AI and get a response
