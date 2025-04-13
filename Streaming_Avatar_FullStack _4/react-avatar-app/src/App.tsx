import { useState, useEffect, useRef } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import "./App.css";

interface PersonaConfig {
  name: string;
  title: string;
  education: {
    degree: string;
    year: string;
    institution: string;
  };
  traits: string[];
  technical: {
    languages: string[];
    webStack: string[];
    projects: string[];
  };
  personality: {
    style: string;
    interests: string[];
    goals: string[];
  };
}

function App() {
  const [personaConfig, setPersonaConfig] = useState<PersonaConfig>({
    name: "Surya Ghosh",
    title: "The Passionate Tech Explorer",
    education: {
      degree: "B.Tech in Electronics and Communication Engineering",
      year: "3rd Year, 6th Semester",
      institution: "Future Institute of Engineering and Management",
    },
    traits: [
      "Curious",
      "passionate",
      "disciplined",
      "hardworking",
      "socially active",
    ],
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
        "Chat + Music Sync App",
      ],
    },
    personality: {
      style:
        "Goal-oriented, practical, and project-driven learner with a love for real-world applications",
      interests: [
        "Artificial Intelligence & Deep Learning",
        "Robotics",
        "Full Stack Web Development",
        "Hackathons & Competitive Coding",
        "Building tech for social good",
      ],
      goals: [
        "Revise and strengthen DSA, Java, and C fundamentals",
        "Build a successful hackathon project (April 12–13)",
        "Contribute daily to research work",
        "Maintain consistency despite distractions",
        "Balance academics, project work, and personal life",
      ],
    },
  });

  // State variables
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [avatarID, setAvatarID] = useState("");
  const [voiceID, setVoiceID] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showVideo, setShowVideo] = useState(true);
  const [removeBG, setRemoveBG] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [botInitialized, setBotInitialized] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: personaConfig.name,
    title: personaConfig.title,
    degree: personaConfig.education.degree,
    year: personaConfig.education.year,
    institution: personaConfig.education.institution,
    languages: personaConfig.technical.languages.join(", "),
    webStack: personaConfig.technical.webStack.join(", "),
    projects: personaConfig.technical.projects.join("\n"),
    style: personaConfig.personality.style,
    interests: personaConfig.personality.interests.join(", "),
    goals: personaConfig.personality.goals.join("\n"),
  });

  // Add status message
  const addStatus = (message: string) => {
    setStatusMessages((prev) => [...prev, message]);
    setStatus(message);
  };

  const openVideoInNewWindow = () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      console.warn("Video not ready yet.");
      return;
    }

    const videoWindow = window.open("", "_blank", "width=640,height=480");
    if (!videoWindow) return;

    videoWindow.document.write(`
      <html>
        <head><title>HeyGen Avatar Stream</title></head>
        <body style="margin:0; background:#000;">
          <video id="heygen-stream" autoplay muted playsinline style="width:100%; height:auto; display:block;"></video>
        </body>
      </html>
    `);

    const interval = setInterval(() => {
      const targetVideo = videoWindow.document.getElementById(
        "heygen-stream"
      ) as HTMLVideoElement;
      if (targetVideo && videoRef.current?.srcObject) {
        targetVideo.srcObject = videoRef.current.srcObject;
        clearInterval(interval);
      }
    }, 300);
  };

  // Load persona config from server
  useEffect(() => {
    const loadPersona = async () => {
      try {
        const response = await fetch("http://localhost:3000/persona/config");
        if (response.ok) {
          const data = await response.json();
          setPersonaConfig(data);

          // Update form data
          setFormData({
            name: data.name,
            title: data.title,
            degree: data.education.degree,
            year: data.education.year,
            institution: data.education.institution,
            languages: data.technical.languages.join(", "),
            webStack: data.technical.webStack.join(", "),
            projects: data.technical.projects.join("\n"),
            style: data.personality.style,
            interests: data.personality.interests.join(", "),
            goals: data.personality.goals.join("\n"),
          });
        }
      } catch (error) {
        console.error("Failed to load persona:", error);
      }
    };

    loadPersona();
  }, []);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id.replace("persona", "").toLowerCase()]: value,
    });
  };

  // Update persona configuration
  const updatePersona = async () => {
    const newConfig = {
      name: formData.name,
      title: formData.title,
      education: {
        degree: formData.degree,
        year: formData.year,
        institution: formData.institution,
      },
      traits: personaConfig.traits,
      technical: {
        languages: formData.languages.split(",").map((item) => item.trim()),
        webStack: formData.webStack.split(",").map((item) => item.trim()),
        projects: formData.projects
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
      personality: {
        style: formData.style,
        interests: formData.interests.split(",").map((item) => item.trim()),
        goals: formData.goals
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    };

    try {
      const response = await fetch("http://localhost:3000/persona/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        const data = await response.json();
        setPersonaConfig(data.data);
        setShowPersonaForm(false);
        addStatus("Persona updated successfully");
      } else {
        addStatus("Failed to update persona");
      }
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Create a new Heygen session
  const createNewSession = async () => {
    if (!avatarID) {
      addStatus("Avatar ID is required");
      return;
    }

    addStatus("Creating new session... please wait");

    try {
      const response = await fetch(
        "http://localhost:3000/persona/heygen/session/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar_name: avatarID,
            voice_id: voiceID || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();
      setSessionInfo(data.data);

      // Create RTCPeerConnection
      const iceServers = data.data.ice_servers2;
      const newPeerConnection = new RTCPeerConnection({ iceServers });

      newPeerConnection.ontrack = (event) => {
        if (event.track.kind === "audio" || event.track.kind === "video") {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        }
      };

      const remoteDescription = new RTCSessionDescription(data.data.sdp);
      await newPeerConnection.setRemoteDescription(remoteDescription);

      setPeerConnection(newPeerConnection);
      addStatus("Session creation completed");
      addStatus("Now you can click the start button to start the stream");
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Start the Heygen session
  const startSession = async () => {
    if (!sessionInfo || !peerConnection) {
      addStatus("Please create a connection first");
      return;
    }

    addStatus("Starting session... please wait");

    try {
      const localDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(localDescription);

      // Setup ICE handling
      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate && sessionInfo) {
          handleICE(sessionInfo.session_id, candidate.toJSON());
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        addStatus(`ICE connection state: ${peerConnection.iceConnectionState}`);
      };

      // Start session
      const response = await fetch(
        "http://localhost:3000/persona/heygen/session/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            sdp: localDescription,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start session");
      }

      // Initialize AI bot
      await initializeBot();

      // Set jitter buffer
      const receivers = peerConnection.getReceivers();
      receivers.forEach((receiver) => {
        if (receiver.jitterBufferTarget !== undefined) {
          receiver.jitterBufferTarget = 500;
        }
      });

      addStatus("Session started successfully");
      setShowVideo(true);
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Handle ICE candidates
  const handleICE = async (
    sessionId: string,
    candidate: RTCIceCandidateInit
  ) => {
    try {
      await fetch("http://localhost:3000/persona/heygen/ice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          candidate,
        }),
      });
    } catch (error) {
      console.error("ICE handling error:", error);
    }
  };

  // Initialize the AI bot
  const initializeBot = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/persona/heygen/init",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            persona_name: personaConfig.name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initialize bot");
      }

      setBotInitialized(true);
      addStatus("Bot initialized successfully");
      return true;
    } catch (error) {
      addStatus("Error initializing bot: " + (error as Error).message);
      return false;
    }
  };

  // Send message to avatar
  const sendMessage = async () => {
    if (!message) {
      addStatus("Message is required");
      return;
    }

    if (!sessionInfo) {
      addStatus("Session not created");
      return;
    }

    addStatus(`Sending message: ${message}`);

    try {
      const response = await fetch(
        "http://localhost:3000/persona/heygen/text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            text: message,
            generate_ai_response: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      addStatus("Message sent successfully");
      setMessage("");
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Send message to get AI response
  const talkToBot = async () => {
    if (!message) {
      addStatus("Message is required");
      return;
    }

    if (!sessionInfo) {
      addStatus("Session not created");
      return;
    }

    addStatus(`Talking to bot: ${message}`);

    try {
      const response = await fetch(
        "http://localhost:3000/persona/heygen/text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            text: message,
            generate_ai_response: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to talk to bot");
      }

      const data = await response.json();
      if (data.ai_response) {
        addStatus(`Bot response: ${data.ai_response}`);
      }
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Close the connection
  const closeConnection = async () => {
    if (!sessionInfo) {
      addStatus("No active session");
      return;
    }

    addStatus("Closing session...");

    try {
      const response = await fetch(
        "http://localhost:3000/persona/heygen/session/stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to close session");
      }

      // Clean up
      if (peerConnection) {
        peerConnection.close();
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Reset state
      setPeerConnection(null);
      setSessionInfo(null);
      setBotInitialized(false);
      setShowVideo(false);

      addStatus("Session closed successfully");
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Toggle background removal
  const toggleBgRemoval = () => {
    setRemoveBG(!removeBG);
    if (!removeBG) {
      renderCanvas();
    } else {
      setShowVideo(true);
    }
  };

  // Render video to canvas
  const renderCanvas = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Process video frames
    const processFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Process for background removal if enabled
        if (removeBG) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];

            // Simple green screen effect - adjust thresholds as needed
            if (green > 100 && red < 100 && blue < 100) {
              data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }

        requestAnimationFrame(processFrame);
      }
    };

    // Start processing
    processFrame();
    setShowVideo(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Persona Configuration
            </h2>
            <Button
              onClick={() => setShowPersonaForm(!showPersonaForm)}
              variant={showPersonaForm ? "outline" : "default"}
              size="default"
            >
              {showPersonaForm ? "Hide Form" : "Edit Persona"}
            </Button>
          </div>

          {showPersonaForm && (
            <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <Input
                    id="personaName"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <Input
                    id="personaTitle"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Education
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Degree
                    </label>
                    <Input
                      id="personaDegree"
                      value={formData.degree}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Year
                    </label>
                    <Input
                      id="personaYear"
                      value={formData.year}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Institution
                    </label>
                    <Input
                      id="personaInstitution"
                      value={formData.institution}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Technical
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Languages (comma-separated)
                    </label>
                    <Input
                      id="personaLanguages"
                      value={formData.languages}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Web Stack (comma-separated)
                    </label>
                    <Input
                      id="personaWebStack"
                      value={formData.webStack}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Projects (one per line)
                    </label>
                    <Textarea
                      id="personaProjects"
                      value={formData.projects}
                      onChange={handleInputChange}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Personality
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Style
                    </label>
                    <Textarea
                      id="personaStyle"
                      value={formData.style}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Interests (comma-separated)
                    </label>
                    <Input
                      id="personaInterests"
                      value={formData.interests}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Goals (one per line)
                    </label>
                    <Textarea
                      id="personaGoals"
                      value={formData.goals}
                      onChange={handleInputChange}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowPersonaForm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={updatePersona} variant="default">
                  Update Persona
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Avatar ID
                  </label>
                  <Input
                    id="avatarID"
                    value={avatarID}
                    onChange={(e) => setAvatarID(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Voice ID
                  </label>
                  <Input
                    id="voiceID"
                    value={voiceID}
                    onChange={(e) => setVoiceID(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  onClick={createNewSession}
                  disabled={sessionInfo}
                  variant="default"
                >
                  New
                </Button>
                <Button
                  onClick={startSession}
                  disabled={!sessionInfo}
                  variant={!sessionInfo ? "outline" : "default"}
                >
                  Start
                </Button>
                <Button
                  onClick={closeConnection}
                  disabled={!sessionInfo}
                  variant="destructive"
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <Input
                  id="taskInput"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  onClick={sendMessage}
                  disabled={!sessionInfo || !botInitialized}
                  variant="secondary"
                >
                  Repeat
                </Button>
                <Button
                  onClick={talkToBot}
                  disabled={!sessionInfo || !botInitialized}
                  variant="default"
                >
                  Talk
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 h-full">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Status</h3>
            <div className="h-52 md:h-64 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
              {statusMessages.map((msg, index) => (
                <div
                  key={index}
                  className="py-1 border-b border-gray-200 last:border-0"
                >
                  {msg}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg shadow-md">
              <video
                ref={videoRef}
                id="mediaElement"
                className={`w-full h-auto object-cover ${
                  showVideo ? "block" : "hidden"
                }`}
                autoPlay
                playsInline
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play();
                    setShowVideo(true);
                    if (removeBG) {
                      renderCanvas();
                    }
                    // openVideoInNewWindow(); // 👉 Automatically open for Zoom capture
                  }
                }}
              />
              <div className="mt-4 flex justify-center">
                <Button onClick={openVideoInNewWindow} variant="secondary">
                  Pop-out Video for Zoom
                </Button>
              </div>

              <canvas
                ref={canvasRef}
                id="canvasElement"
                className={`w-full h-auto ${!showVideo ? "block" : "hidden"}`}
              />
            </div>

            {sessionInfo && (
              <div className="mt-4 flex items-center justify-center">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBG}
                    onChange={toggleBgRemoval}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Remove Background
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
