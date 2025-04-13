'use strict';

import { heygenService } from '../services/heygenService.js';
import { aiService } from '../services/aiService.js';

const heygen_API = {
  apiKey: process.env.HEYGEN_APIKEY,
  serverUrl: 'https://api.heygen.com',
};

const statusElement = document.querySelector('#status');
const avatarID = document.querySelector('#avatarID');
const voiceID = document.querySelector('#voiceID');
const apiKey = heygen_API.apiKey;
const SERVER_URL = heygen_API.serverUrl;

if (apiKey === 'YourApiKey' || SERVER_URL === '') {
  alert('Please enter your API key and server URL in the api.json file');
}

class AvatarApp {
    constructor() {
        this.sessionInfo = null;
        this.peerConnection = null;
        this.mediaCanPlay = false;

        // DOM Elements
        this.elements = {
            status: document.querySelector('#status'),
            avatarId: document.querySelector('#avatarID'),
            voiceId: document.querySelector('#voiceID'),
            taskInput: document.querySelector('#taskInput'),
            mediaElement: document.querySelector('#mediaElement'),
            canvasElement: document.querySelector('#canvasElement'),
            bgCheckboxWrap: document.querySelector('#bgCheckboxWrap'),
            bgInput: document.querySelector('#bgInput'),
            removeBGCheckbox: document.querySelector('#removeBGCheckbox'),
            // Persona form elements
            editPersonaBtn: document.querySelector('#editPersonaBtn'),
            personaForm: document.querySelector('#personaForm'),
            updatePersonaBtn: document.querySelector('#updatePersonaBtn'),
            cancelPersonaBtn: document.querySelector('#cancelPersonaBtn'),
            personaInputs: {
                name: document.querySelector('#personaName'),
                title: document.querySelector('#personaTitle'),
                degree: document.querySelector('#personaDegree'),
                year: document.querySelector('#personaYear'),
                institution: document.querySelector('#personaInstitution'),
                languages: document.querySelector('#personaLanguages'),
                webStack: document.querySelector('#personaWebStack'),
                projects: document.querySelector('#personaProjects'),
                style: document.querySelector('#personaStyle'),
                interests: document.querySelector('#personaInterests'),
                goals: document.querySelector('#personaGoals')
            }
        };

        this.initializeEventListeners();
        this.loadCurrentPersona();
    }

    async loadCurrentPersona() {
        try {
            const response = await fetch('http://localhost:3000/persona-config');
            if (!response.ok) throw new Error('Failed to fetch persona config');
            
            const config = await response.json();
            this.updatePersonaForm(config);
        } catch (error) {
            console.error('Failed to load persona:', error);
        }
    }

    updatePersonaForm(config) {
        const inputs = this.elements.personaInputs;
        inputs.name.value = config.name;
        inputs.title.value = config.title;
        inputs.degree.value = config.education.degree;
        inputs.year.value = config.education.year;
        inputs.institution.value = config.education.institution;
        inputs.languages.value = config.technical.languages.join(', ');
        inputs.webStack.value = config.technical.webStack.join(', ');
        inputs.projects.value = config.technical.projects.join('\n');
        inputs.style.value = config.personality.style;
        inputs.interests.value = config.personality.interests.join(', ');
        inputs.goals.value = config.personality.goals.join('\n');
    }

    getPersonaFormData() {
        const inputs = this.elements.personaInputs;
        return {
            name: inputs.name.value,
            title: inputs.title.value,
            education: {
                degree: inputs.degree.value,
                year: inputs.year.value,
                institution: inputs.institution.value
            },
            technical: {
                languages: inputs.languages.value.split(',').map(s => s.trim()),
                webStack: inputs.webStack.value.split(',').map(s => s.trim()),
                projects: inputs.projects.value.split('\n').filter(s => s.trim())
            },
            personality: {
                style: inputs.style.value,
                interests: inputs.interests.value.split(',').map(s => s.trim()),
                goals: inputs.goals.value.split('\n').filter(s => s.trim())
            }
        };
    }

    async updatePersonaConfig() {
        try {
            const config = this.getPersonaFormData();
            const response = await fetch('http://localhost:3000/update-persona', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) throw new Error('Failed to update persona');
            
            this.elements.personaForm.classList.add('hide');
            this.updateStatus('Persona updated successfully');
        } catch (error) {
            console.error('Failed to update persona:', error);
            this.updateStatus('Failed to update persona: ' + error.message);
        }
    }

    initializeEventListeners() {
        document.querySelector('#newBtn').addEventListener('click', () => this.createNewSession());
        document.querySelector('#startBtn').addEventListener('click', () => this.startAndDisplaySession());
        document.querySelector('#repeatBtn').addEventListener('click', () => this.repeatHandler());
        document.querySelector('#closeBtn').addEventListener('click', () => this.closeConnectionHandler());
        document.querySelector('#talkBtn').addEventListener('click', () => this.talkHandler());

        this.elements.editPersonaBtn.addEventListener('click', () => {
            this.elements.personaForm.classList.remove('hide');
        });

        this.elements.updatePersonaBtn.addEventListener('click', () => {
            this.updatePersonaConfig();
        });

        this.elements.cancelPersonaBtn.addEventListener('click', () => {
            this.elements.personaForm.classList.add('hide');
            this.loadCurrentPersona();
        });

        this.elements.mediaElement.onloadedmetadata = () => {
            this.mediaCanPlay = true;
            this.elements.mediaElement.play();
            this.showElement(this.elements.bgCheckboxWrap);
        };

        this.elements.removeBGCheckbox.addEventListener('click', () => this.handleBackgroundToggle());
        this.elements.bgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.renderCanvas();
        });
    }

    updateStatus(message) {
        this.elements.status.innerHTML += message + '<br>';
        this.elements.status.scrollTop = this.elements.status.scrollHeight;
    }

    async createNewSession() {
        this.updateStatus('Creating new session... please wait');

        try {
            const avatar = this.elements.avatarId.value;
            const voice = this.elements.voiceId.value;

            this.sessionInfo = await heygenService.createSession(avatar, voice);
            const { sdp: serverSdp, ice_servers2: iceServers } = this.sessionInfo;

            this.peerConnection = new RTCPeerConnection({ iceServers });

            this.peerConnection.ontrack = (event) => {
                if (event.track.kind === 'audio' || event.track.kind === 'video') {
                    this.elements.mediaElement.srcObject = event.streams[0];
                }
            };

            const remoteDescription = new RTCSessionDescription(serverSdp);
            await this.peerConnection.setRemoteDescription(remoteDescription);

            this.updateStatus('Session creation completed');
            this.updateStatus('Now you can click the start button to start the stream');
        } catch (error) {
            console.error('Session creation error:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    async startAndDisplaySession() {
        if (!this.sessionInfo) {
            this.updateStatus('Please create a connection first');
            return;
        }

        this.updateStatus('Starting session... please wait');

        try {
            const localDescription = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(localDescription);

            this.peerConnection.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    heygenService.handleICE(this.sessionInfo.session_id, candidate.toJSON());
                }
            };

            this.peerConnection.oniceconnectionstatechange = () => {
                this.updateStatus(`ICE connection state: ${this.peerConnection.iceConnectionState}`);
            };

            await heygenService.startSession(this.sessionInfo.session_id, localDescription);

            const receivers = this.peerConnection.getReceivers();
            receivers.forEach(receiver => receiver.jitterBufferTarget = 500);

            this.updateStatus('Session started successfully');
        } catch (error) {
            console.error('Session start error:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    async repeatHandler() {
        if (!this.sessionInfo) {
            this.updateStatus('Please create a connection first');
            return;
        }

        const text = this.elements.taskInput.value;
        if (!text.trim()) {
            alert('Please enter a task');
            return;
        }

        this.updateStatus('Sending task... please wait');
        try {
            await heygenService.sendText(this.sessionInfo.session_id, text);
            this.updateStatus('Task sent successfully');
        } catch (error) {
            console.error('Task error:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    async talkHandler() {
        if (!this.sessionInfo) {
            this.updateStatus('Please create a connection first');
            return;
        }

        const prompt = this.elements.taskInput.value;
        if (!prompt.trim()) {
            alert('Please enter a message for Surya');
            return;
        }

        this.updateStatus('Talking to Surya... please wait');

        try {
            if (!window.aiInitialized) {
                await aiService.initialize();
                window.aiInitialized = true;
            }

            const response = await aiService.getResponse(prompt);
            if (response) {
                await heygenService.sendText(this.sessionInfo.session_id, response);
                this.updateStatus('Surya responded successfully');
            } else {
                this.updateStatus('Failed to get a response from Surya');
            }
        } catch (error) {
            console.error('AI chat error:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    async closeConnectionHandler() {
        if (!this.sessionInfo) {
            this.updateStatus('Please create a connection first');
            return;
        }

        this.updateStatus('Closing connection... please wait');
        try {
            this.peerConnection.close();
            await heygenService.stopSession(this.sessionInfo.session_id);
            this.updateStatus('Connection closed successfully');

            this.sessionInfo = null;
            this.mediaCanPlay = false;
            this.hideElement(this.elements.canvasElement);
            this.hideElement(this.elements.bgCheckboxWrap);
        } catch (error) {
            console.error('Connection close error:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    handleBackgroundToggle() {
        const isChecked = this.elements.removeBGCheckbox.checked;

        if (isChecked && !this.sessionInfo) {
            this.updateStatus('Please create a connection first');
            this.elements.removeBGCheckbox.checked = false;
            return;
        }

        if (isChecked && !this.mediaCanPlay) {
            this.updateStatus('Please wait for the video to load');
            this.elements.removeBGCheckbox.checked = false;
            return;
        }

        if (isChecked) {
            this.hideElement(this.elements.mediaElement);
            this.showElement(this.elements.canvasElement);
            this.renderCanvas();
        } else {
            this.hideElement(this.elements.canvasElement);
            this.showElement(this.elements.mediaElement);
        }
    }

    renderCanvas() {
        if (!this.elements.removeBGCheckbox.checked) return;

        const ctx = this.elements.canvasElement.getContext('2d', { willReadFrequently: true });
        if (this.elements.bgInput.value) {
            this.elements.canvasElement.parentElement.style.background = this.elements.bgInput.value.trim();
        }

        const processFrame = () => {
            if (!this.elements.removeBGCheckbox.checked) return;

            this.elements.canvasElement.width = this.elements.mediaElement.videoWidth;
            this.elements.canvasElement.height = this.elements.mediaElement.videoHeight;

            ctx.drawImage(this.elements.mediaElement, 0, 0, this.elements.canvasElement.width, this.elements.canvasElement.height);
            const imageData = ctx.getImageData(0, 0, this.elements.canvasElement.width, this.elements.canvasElement.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                if (this.isCloseToGreen([data[i], data[i + 1], data[i + 2]])) {
                    data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            requestAnimationFrame(processFrame);
        };

        processFrame();
    }

    isCloseToGreen([red, green, blue]) {
        return green > 90 && red < 90 && blue < 90;
    }

    showElement(element) {
        element.classList.add('show');
        element.classList.remove('hide');
    }

    hideElement(element) {
        element.classList.add('hide');
        element.classList.remove('show');
    }
}

// Initialize the application
const app = new AvatarApp();
app.updateStatus('Please click the new button to create the stream first.');
