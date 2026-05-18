import React, { useContext, useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button, Box, Typography, Paper, Drawer, AppBar, Toolbar } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import styles from "../style/videoComponent.module.css";
import server from '../environment';
import { AuthContext } from '../context/AuthContext';

const server_url = server;
let connections = {};

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
}

export default function VideoMeetComponent() {
  const { user, getUsername } = useContext(AuthContext);

  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();
  const localPreviewRef = useRef();
  const localStreamRef = useRef(null);
  const localStreamRequestedRef = useRef(false);
  const participantNamesRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const remoteStreamsRef = useRef({});
  const localCanvasRef = useRef(null);
  const localCanvasIntervalRef = useRef(null);
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [videos, setVideos] = useState([])
  const [maximizedVideo, setMaximizedVideo] = useState(null);
  const [hoveredVideo, setHoveredVideo] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [participantNames, setParticipantNames] = useState({});
  const [cameraError, setCameraError] = useState("");
  const [localVideoMirrored, setLocalVideoMirrored] = useState(false);

  const chatDisplayRef = useRef(null);

  useEffect(() => {
    connections = {};

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      Object.keys(connections).forEach(id => {
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });
      pendingIceCandidatesRef.current = {};
      remoteStreamsRef.current = {};
      makingOfferRef.current = {};
      ignoreOfferRef.current = {};
      if (localCanvasIntervalRef.current) {
        clearInterval(localCanvasIntervalRef.current);
        localCanvasIntervalRef.current = null;
      }
    };
  }, []);

  // Get room ID from URL
  useEffect(() => {
    const meetingCode = decodeURIComponent(window.location.pathname.replace(/^\/+/, ""));
    setRoomId(meetingCode);
  }, []);

  useEffect(() => {
    const signedInUsername = getUsername?.() || user?.username || user?.name || "";
    if (signedInUsername && !username.trim()) {
      setUsername(signedInUsername);
    }
  }, [getUsername, user, username]);

  // Auto scroll chat
  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!askForUsername && localVideoref.current && localStreamRef.current) {
      localVideoref.current.srcObject = localStreamRef.current;
    }
  }, [askForUsername, localStreamReady]);

  const attachLocalStream = (videoElement) => {
    if (videoElement && localStreamRef.current && videoElement.srcObject !== localStreamRef.current) {
      videoElement.srcObject = localStreamRef.current;
      videoElement.play?.().catch(err => console.log("Local video play failed:", err));
    }
  };

  const createFallbackStream = (label = "Camera unavailable") => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    localCanvasRef.current = canvas;

    const drawFrame = () => {
      const context = canvas.getContext("2d");
      context.fillStyle = "#1a1a1a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#FF9839";
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2 - 44, 54, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = "600 42px Arial";
      context.textAlign = "center";
      context.fillText(username?.charAt(0)?.toUpperCase() || "U", canvas.width / 2, canvas.height / 2 - 28);
      context.font = "600 34px Arial";
      context.fillText(username || "Participant", canvas.width / 2, canvas.height / 2 + 58);
      context.font = "24px Arial";
      context.fillText(label, canvas.width / 2, canvas.height / 2 + 102);
    };

    drawFrame();
    if (localCanvasIntervalRef.current) clearInterval(localCanvasIntervalRef.current);
    localCanvasIntervalRef.current = setInterval(drawFrame, 1000);

    const stream = canvas.captureStream(5);
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    destination.stream.getAudioTracks().forEach(track => {
      track.enabled = false;
      stream.addTrack(track);
    });

    return stream;
  };

  const startLocalStream = async () => {
    if (localStreamRef.current) {
      if (localVideoref.current) localVideoref.current.srcObject = localStreamRef.current;
      if (localPreviewRef.current) localPreviewRef.current.srcObject = localStreamRef.current;
      return localStreamRef.current;
    }

    try {
      localStreamRequestedRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.localStream = stream;
      localStreamRef.current = stream;
      setCameraError("");
      setLocalVideoMirrored(true);
      setLocalStreamReady(true);
      attachLocalStream(localVideoref.current);
      attachLocalStream(localPreviewRef.current);
      return stream;
    } catch (err) {
      console.log("Error getting media:", err);
      const fallbackStream = createFallbackStream("Camera is busy or blocked");
      window.localStream = fallbackStream;
      localStreamRef.current = fallbackStream;
      setCameraError("Camera is busy or blocked. Showing a placeholder stream.");
      setLocalVideoMirrored(false);
      setLocalStreamReady(true);
      attachLocalStream(localVideoref.current);
      attachLocalStream(localPreviewRef.current);
      return fallbackStream;
    }
  };

  const toggleVideo = () => {
    if (window.localStream) {
      const track = window.localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setVideoEnabled(track.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (window.localStream) {
      const track = window.localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setAudioEnabled(track.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        
        // Replace video track for all connections
        const videoTrack = stream.getVideoTracks()[0];
        Object.keys(connections).forEach(connectionId => {
          const sender = connections[connectionId]?.getSenders()?.find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
      // Update local video
      if (localVideoref.current) {
        const newStream = new MediaStream();
        newStream.addTrack(videoTrack);
        if (window.localStream.getAudioTracks()[0]) {
          newStream.addTrack(window.localStream.getAudioTracks()[0]);
        }
        localVideoref.current.srcObject = newStream;
        window.localStream = newStream;
        localStreamRef.current = newStream;
      }
      setLocalVideoMirrored(false);
        
        videoTrack.onended = () => {
          toggleScreenShare();
        };
        
        setScreenSharing(true);
      } catch (err) {
        console.log("Screen sharing cancelled:", err);
      }
    } else {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      
      // Revert to camera
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = cameraStream.getVideoTracks()[0];
      
      Object.keys(connections).forEach(connectionId => {
        const sender = connections[connectionId]?.getSenders()?.find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Update local video
      if (localVideoref.current) {
        const newStream = new MediaStream();
        newStream.addTrack(videoTrack);
        if (window.localStream.getAudioTracks()[0]) {
          newStream.addTrack(window.localStream.getAudioTracks()[0]);
        }
        localVideoref.current.srcObject = newStream;
        window.localStream = newStream;
        localStreamRef.current = newStream;
      }
      
      setLocalVideoMirrored(true);
      setScreenSharing(false);
    }
  };

  const leaveCall = () => {
    if (socketRef.current) socketRef.current.disconnect();
    Object.keys(connections).forEach(id => {
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }
    });
    if (window.localStream) {
      window.localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    if (localCanvasIntervalRef.current) {
      clearInterval(localCanvasIntervalRef.current);
      localCanvasIntervalRef.current = null;
    }
    pendingIceCandidatesRef.current = {};
    remoteStreamsRef.current = {};
    makingOfferRef.current = {};
    ignoreOfferRef.current = {};
    setLocalStreamReady(false);
    window.location.href = '/home';
  };

  const getOrCreateRemoteStream = (socketId) => {
    if (!remoteStreamsRef.current[socketId]) {
      remoteStreamsRef.current[socketId] = new MediaStream();
    }
    return remoteStreamsRef.current[socketId];
  };

  const addLocalTracks = (peerConnection) => {
    const stream = localStreamRef.current || window.localStream;
    if (!stream) return;

    stream.getTracks().forEach(track => {
      const alreadyAdded = peerConnection.getSenders().some(sender => sender.track === track);
      if (!alreadyAdded) {
        peerConnection.addTrack(track, stream);
      }
    });
  };

  const sendLocalDescription = (socketId) => {
    if (socketRef.current && connections[socketId]?.localDescription) {
      socketRef.current.emit('signal', socketId, JSON.stringify({
        sdp: connections[socketId].localDescription
      }));
    }
  };

  const createPeerConnection = (socketId) => {
    if (connections[socketId]) {
      return connections[socketId];
    }

    connections[socketId] = new RTCPeerConnection(peerConfigConnections);

    connections[socketId].onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', socketId, JSON.stringify({ ice: event.candidate }));
      }
    };

    connections[socketId].onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[socketId] = true;
        await connections[socketId].setLocalDescription();
        sendLocalDescription(socketId);
      } catch (err) {
        console.log("Error during negotiation:", err);
      } finally {
        makingOfferRef.current[socketId] = false;
      }
    };

    connections[socketId].ontrack = (event) => {
      const remoteStream = event.streams?.[0] || getOrCreateRemoteStream(socketId);
      if (!event.streams?.[0] && !remoteStream.getTracks().some(track => track.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }
      console.log("Received track from:", socketId);
      setVideos(prev => {
        const existingVideo = prev.find(v => v.socketId === socketId);
        if (!existingVideo) {
          return [...prev, {
            socketId,
            stream: remoteStream,
            username: participantNamesRef.current[socketId] || "Participant"
          }];
        }
        if (existingVideo.stream === remoteStream) {
          return prev;
        }
        return prev.map(video => (
          video.socketId === socketId
            ? { ...video, stream: remoteStream }
            : video
        ));
      });
    };

    addLocalTracks(connections[socketId]);

    return connections[socketId];
  };

  const createOffer = (socketId) => {
    if (!connections[socketId]) {
      createPeerConnection(socketId);
    }

    addLocalTracks(connections[socketId]);

    if (connections[socketId].signalingState !== "stable") return;

    connections[socketId].setLocalDescription()
      .then(() => sendLocalDescription(socketId))
      .catch(err => console.log("Error creating offer:", err));
  };

  const applyPendingIceCandidates = async (fromId) => {
    const peerConnection = connections[fromId];
    const pendingCandidates = pendingIceCandidatesRef.current[fromId] || [];

    if (!peerConnection?.remoteDescription || pendingCandidates.length === 0) return;

    pendingIceCandidatesRef.current[fromId] = [];

    for (const candidate of pendingCandidates) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.log("Error adding queued ICE:", err);
      }
    }
  };

  const gotMessageFromServer = async (fromId, message) => {
    const signal = JSON.parse(message);

    if (fromId === socketIdRef.current) return;

    if (!connections[fromId]) {
      createPeerConnection(fromId);
    }

    if (signal.sdp) {
      try {
        const peerConnection = connections[fromId];
        const description = new RTCSessionDescription(signal.sdp);
        const isOffer = description.type === "offer";
        const readyForOffer = !makingOfferRef.current[fromId] && (
          peerConnection.signalingState === "stable" || peerConnection.signalingState === "have-local-offer"
        );
        const offerCollision = isOffer && !readyForOffer;
        const polite = socketIdRef.current > fromId;

        ignoreOfferRef.current[fromId] = !polite && offerCollision;
        if (ignoreOfferRef.current[fromId]) return;

        if (isOffer && peerConnection.signalingState === "have-local-offer") {
          await peerConnection.setLocalDescription({ type: "rollback" });
        }

        await peerConnection.setRemoteDescription(description);
        await applyPendingIceCandidates(fromId);

        if (isOffer) {
          addLocalTracks(peerConnection);
          await peerConnection.setLocalDescription();
          sendLocalDescription(fromId);
        }
      } catch (err) {
        console.log("Error handling SDP:", err);
      }
    }

    if (signal.ice) {
      const candidate = new RTCIceCandidate(signal.ice);

      if (ignoreOfferRef.current[fromId]) return;

      if (connections[fromId].remoteDescription) {
        connections[fromId].addIceCandidate(candidate)
          .catch(err => console.log("Error adding ICE:", err));
      } else {
        pendingIceCandidatesRef.current[fromId] = pendingIceCandidatesRef.current[fromId] || [];
        pendingIceCandidatesRef.current[fromId].push(candidate);
      }
    }
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url);

    socketRef.current.on('signal', gotMessageFromServer);
    
    socketRef.current.on('chat-message', (data, sender, senderSocketId) => {
      if (senderSocketId && senderSocketId === socketIdRef.current) return;
      setMessages(prev => [...prev, { sender, data, timestamp: new Date().toLocaleTimeString() }]);
      if (sender !== username) setNewMessages(prev => prev + 1);
    });

    socketRef.current.on('user-left', (id) => {
      setVideos(prev => prev.filter(v => v.socketId !== id));
      setParticipantNames(prev => {
        const next = { ...prev };
        delete next[id];
        participantNamesRef.current = next;
        return next;
      });
      delete pendingIceCandidatesRef.current[id];
      delete remoteStreamsRef.current[id];
      delete makingOfferRef.current[id];
      delete ignoreOfferRef.current[id];
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }
    });

    socketRef.current.on('user-joined', (id, clients, names = {}) => {
      console.log("User joined:", id);
      participantNamesRef.current = { ...participantNamesRef.current, ...names };
      setParticipantNames({ ...participantNamesRef.current });
      setVideos(prev => prev.map(video => ({
        ...video,
        username: participantNamesRef.current[video.socketId] || video.username || "Participant"
      })));
      
      clients.forEach(clientId => {
        if (clientId !== socketIdRef.current) {
          createPeerConnection(clientId);
        }
      });

      if (id !== socketIdRef.current) {
        createOffer(id);
      }
    });

    socketRef.current.on('connect', () => {
      console.log("Connected to server");
      socketIdRef.current = socketRef.current.id;
      const meetingRoom = roomId || decodeURIComponent(window.location.pathname.replace(/^\/+/, ""));
      socketRef.current.emit('join-call', meetingRoom, username);
    });
  };

  // Fixed: No duplicate messages
  const sendMessage = () => {
    if (message.trim()) {
      const msgText = message.trim();
      socketRef.current.emit('chat-message', msgText, username);
      setMessages(prev => [...prev, { sender: username, data: msgText, timestamp: new Date().toLocaleTimeString() }]);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const connect = async () => {
    if (username.trim()) {
      await startLocalStream();
      setAskForUsername(false);
      connectToSocketServer();
    }
  };

  return (
    <div className={styles.meetingContainer}>
      {askForUsername ? (
        <div className={styles.lobbyContainer}>
          <Paper elevation={3} className={styles.lobbyCard}>
            <Typography variant="h4" gutterBottom className={styles.lobbyTitle}>Join Meeting</Typography>
            <Typography variant="body1" gutterBottom>Room ID: <strong>{roomId}</strong></Typography>
            <TextField 
              fullWidth
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              label="Enter your username" 
              margin="normal"
              onKeyDown={e => e.key === 'Enter' && connect()}
            />
            <Button 
              fullWidth
              variant="contained" 
              onClick={connect}
              disabled={!username.trim()}
              sx={{ mt: 2, bgcolor: '#FF9839' }}
            >
              Join Meeting
            </Button>
            {cameraError && <Typography variant="caption" className={styles.cameraError}>{cameraError}</Typography>}
          </Paper>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {/* Meeting Info Bar */}
          <div className={styles.meetingInfoBar}>
            <span>Room: <strong>{roomId}</strong> | You: <strong>{username}</strong></span>
          </div>

          {/* Video Grid */}
          <div className={styles.videoGrid}>
            {/* Self Video */}
            <div 
              className={`${styles.videoWrapper} ${styles.selfVideo} ${videos.length > 0 ? styles.pinnedSelfVideo : styles.selfVideoMain} ${maximizedVideo === "self" ? styles.maximized : ""}`}
              onMouseEnter={() => setHoveredVideo("self")}
              onMouseLeave={() => setHoveredVideo(null)}
            >
              <video
                ref={ref => {
                  localVideoref.current = ref;
                  attachLocalStream(ref);
                }}
                autoPlay
                muted
                playsInline
                className={`${styles.videoElement} ${localVideoMirrored ? styles.mirroredVideo : ""}`}
              ></video>
              <div className={styles.videoOverlay}>
                <div className={styles.usernameBadge}>
                  <span className={styles.username}>{username} (You) {screenSharing && "(Screen)"}</span>
                </div>
                {hoveredVideo === "self" && !maximizedVideo && (
                  <button className={styles.maximizeBtn} onClick={() => setMaximizedVideo("self")} aria-label="Maximize self video">
                    <FullscreenIcon fontSize="small" />
                  </button>
                )}
                {maximizedVideo === "self" && (
                  <button className={styles.closeMaximizeBtn} onClick={() => setMaximizedVideo(null)}><CloseIcon /></button>
                )}
              </div>
            </div>

            {/* Remote Videos */}
            {videos.map(video => (
              <div 
                key={video.socketId}
                className={`${styles.videoWrapper} ${maximizedVideo === video.socketId ? styles.maximized : ""}`}
                onMouseEnter={() => setHoveredVideo(video.socketId)}
                onMouseLeave={() => setHoveredVideo(null)}
              >
                <video 
                  ref={ref => {
                    if (ref && ref.srcObject !== video.stream) {
                      ref.srcObject = video.stream;
                      ref.play?.().catch(err => {
                        console.log("Remote video play failed:", err);
                        ref.muted = true;
                        ref.play?.().catch(playErr => console.log("Muted remote video play failed:", playErr));
                      });
                    }
                  }} 
                  autoPlay 
                  playsInline 
                  className={styles.videoElement}
                />
                <div className={styles.videoOverlay}>
                  <div className={styles.usernameBadge}>
                    <span className={styles.username}>{video.username || participantNames[video.socketId] || "Participant"}</span>
                  </div>
                  {hoveredVideo === video.socketId && !maximizedVideo && (
                    <button className={styles.maximizeBtn} onClick={() => setMaximizedVideo(video.socketId)} aria-label="Maximize participant video">
                      <FullscreenIcon fontSize="small" />
                    </button>
                  )}
                  {maximizedVideo === video.socketId && (
                    <button className={styles.closeMaximizeBtn} onClick={() => setMaximizedVideo(null)}><CloseIcon /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Controls Bar */}
          <div className={styles.controlsBar}>
            <IconButton onClick={toggleVideo} className={styles.controlBtn}>
              {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={toggleAudio} className={styles.controlBtn}>
              {audioEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            <IconButton onClick={toggleScreenShare} className={styles.controlBtn}>
              {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
            <IconButton onClick={leaveCall} className={`${styles.controlBtn} ${styles.endCallBtn}`}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={() => setChatOpen(!chatOpen)} className={styles.controlBtn}>
              <Badge badgeContent={newMessages} color="error"><ChatIcon /></Badge>
            </IconButton>
          </div>

          {/* Chat Drawer */}
          <Drawer anchor="right" open={chatOpen} onClose={() => { setChatOpen(false); setNewMessages(0); }}>
            <Box sx={{ width: { xs: '100%', sm: 400 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <AppBar position="static" sx={{ bgcolor: '#FF9839' }}>
                <Toolbar>
                  <Typography sx={{ flexGrow: 1 }}>Chat</Typography>
                  <IconButton color="inherit" onClick={() => setChatOpen(false)}><CloseIcon /></IconButton>
                </Toolbar>
              </AppBar>
              <Box ref={chatDisplayRef} sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {messages.map((msg, i) => (
                  <Box key={i} sx={{ mb: 1, textAlign: msg.sender === username ? 'right' : 'left' }}>
                    <Paper sx={{ p: 1, display: 'inline-block', maxWidth: '80%', bgcolor: msg.sender === username ? '#FF9839' : '#f0f0f0', color: msg.sender === username ? 'white' : 'black' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>{msg.sender}</Typography>
                      <Typography variant="body2">{msg.data}</Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', display: 'block', mt: 0.5 }}>{msg.timestamp}</Typography>
                    </Paper>
                  </Box>
                ))}
              </Box>
              <Box sx={{ p: 2, borderTop: 1, display: 'flex', gap: 1 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Type a message..." 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  onKeyDown={handleKeyPress}
                />
                <Button variant="contained" onClick={sendMessage} sx={{ bgcolor: '#FF9839' }}>Send</Button>
              </Box>
            </Box>
          </Drawer>
        </div>
      )}
    </div>
  )
}
