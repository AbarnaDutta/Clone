import { persona } from "./utils/persona.js";

/**
 * Initialize the chatbot with the persona of Surya
 * @returns {Promise<boolean>} - Success status
 */
async function initializeSuryaBot() {
    try {
        const response = await fetch('http://localhost:3000/persona/heygen/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                persona_name: persona.name
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to initialize Surya bot');
        }
        
        console.log('Surya bot initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Surya bot:', error);
        return false;
    }
}

/**
 * Get AI response for the user input
 * @param {string} userInput - User message
 * @returns {Promise<string>} - AI generated response
 */
async function getSuryaResponse(userInput) {
    try {
        const response = await fetch('http://localhost:3000/openai/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: `User: ${userInput}\nAI:`,
                includePersona: true
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get Surya response');
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error getting Surya response:', error);
        return 'Sorry, I had a glitch. Can you ask that again?';
    }
}

/**
 * Create a session with Heygen using the provided avatar ID
 * @param {string} avatarId - Heygen avatar ID
 * @param {string} voiceId - Heygen voice ID
 * @returns {Promise<Object>} - Session information
 */
async function createHeygenSession(avatarId, voiceId) {
    try {
        const response = await fetch('http://localhost:3000/persona/heygen/session/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                avatar_name: avatarId,
                voice_id: voiceId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create Heygen session');
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error creating Heygen session:', error);
        throw error;
    }
}

/**
 * Start a session with Heygen
 * @param {string} sessionId - Heygen session ID
 * @param {Object} sdp - SDP object
 * @returns {Promise<Object>} - Start response
 */
async function startHeygenSession(sessionId, sdp) {
    try {
        const response = await fetch('http://localhost:3000/persona/heygen/session/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                sdp
            })
        });

        if (!response.ok) {
            throw new Error('Failed to start Heygen session');
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error starting Heygen session:', error);
        throw error;
    }
}

/**
 * Send text to Heygen session and get AI response
 * @param {string} sessionId - Heygen session ID
 * @param {string} text - Text to send
 * @param {boolean} generateAiResponse - Whether to generate AI response
 * @returns {Promise<Object>} - Response data
 */
async function sendTextToHeygen(sessionId, text, generateAiResponse = false) {
    try {
        const response = await fetch('http://localhost:3000/persona/heygen/text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                text,
                generate_ai_response: generateAiResponse
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send text to Heygen');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error sending text to Heygen:', error);
        throw error;
    }
}

/**
 * Stop Heygen session
 * @param {string} sessionId - Heygen session ID
 * @returns {Promise<Object>} - Stop response
 */
async function stopHeygenSession(sessionId) {
    try {
        const response = await fetch('http://localhost:3000/persona/heygen/session/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to stop Heygen session');
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error stopping Heygen session:', error);
        throw error;
    }
}

export {
    initializeSuryaBot,
    getSuryaResponse,
    createHeygenSession,
    startHeygenSession,
    sendTextToHeygen,
    stopHeygenSession
};