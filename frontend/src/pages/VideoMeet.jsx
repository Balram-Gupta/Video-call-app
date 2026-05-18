import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import style from "../style/videoComponent.module.css";
import server from '../environment';

const server_url = server;
let peerConnections = {};

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const localPreviewRef = useRef();
  const localStreamRef = useRef();
  const pendingIceCandidatesRef = useRef({});
  const remoteUserNamesRef = useRef({});
  
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessages, setNewMessages] = useState(0);
  const [maximizedVideo, setMaximizedVideo] = useState(null);
  
  const chatDisplayRef = useRef(null);

  // Get room ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const meetingCode = decodeURIComponent(path.replace(/^\/+/, ""));
    setRoomId(meetingCode || "default-room");
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);

  // Attach the stream after the meeting view mounts.
  useEffect(() => {
    if (isJoined && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isJoined]);

  const upsertRemoteUser = (socketId, stream = null, username = null) => {
    if (!socketId || socketId === socketIdRef.current) return;

    setRemoteUsers(prev => {
      const existingUser = prev.find(u => u.socketId === socketId);
      const nextUsername = username || remoteUserNamesRef.current[socketId] || `User-${socketId.slice(-4)}`;

      if (existingUser) {
        return prev.map(u =>
          u.socketId === socketId
            ? { ...u, username: nextUsername, stream: stream || u.stream }
            : u
        );
      }

      return [...prev, {
        socketId,
        username: nextUsername,
        stream
      }];
    });
  };

  // Start local stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (localPreviewRef.current) {
        localPreviewRef.current.srcObject = stream;
      }
      
      console.log("Local stream started");
      return stream;
    } catch (err) {
      console.error("Error getting media:", err);
      return null;
    }
  };

  // Create peer connection for remote user
  const createPeerConnection = (remoteSocketId) => {
    if (peerConnections[remoteSocketId]) {
      return peerConnections[remoteSocketId];
    }

    console.log("Creating peer connection for:", remoteSocketId);
    const pc = new RTCPeerConnection(configuration);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', remoteSocketId, JSON.stringify({
          ice: event.candidate
        }));
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("Received track from:", remoteSocketId, event.track.kind);

      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.socketId === remoteSocketId);
        const stream = existingUser?.stream || event.streams?.[0] || new MediaStream();

        if (!stream.getTracks().includes(event.track)) {
          stream.addTrack(event.track);
        }

        if (existingUser) {
          return prev.map(u =>
            u.socketId === remoteSocketId ? { ...u, stream } : u
          );
        }

        return [...prev, {
          socketId: remoteSocketId,
          username: remoteUserNamesRef.current[remoteSocketId] || `User-${remoteSocketId.slice(-4)}`,
          stream
        }];
      });
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${remoteSocketId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log("Successfully connected to:", remoteSocketId);
      } else if (pc.connectionState === 'failed') {
        console.log("Connection failed for:", remoteSocketId);
        setRemoteUsers(prev => prev.filter(u => u.socketId !== remoteSocketId));
        delete peerConnections[remoteSocketId];
      }
    };

    peerConnections[remoteSocketId] = pc;
    return pc;
  };

  // Create and send offer
  const createOffer = async (remoteSocketId) => {
    const pc = createPeerConnection(remoteSocketId);
    
    if (pc.signalingState !== "stable") {
      console.log("Signaling state not stable, waiting...");
      return;
    }
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('signal', remoteSocketId, JSON.stringify({
        sdp: pc.localDescription
      }));
      console.log("Offer sent to:", remoteSocketId);
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  // Handle incoming signals
  const handleSignal = async (fromId, message) => {
    if (fromId === socketIdRef.current) return;
    
    const signal = JSON.parse(message);
    const pc = createPeerConnection(fromId);
    
    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        if (pendingIceCandidatesRef.current[fromId]?.length) {
          for (const candidate of pendingIceCandidatesRef.current[fromId]) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          delete pendingIceCandidatesRef.current[fromId];
        }
        
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('signal', fromId, JSON.stringify({
            sdp: pc.localDescription
          }));
          console.log("Answer sent to:", fromId);
        }
      } else if (signal.ice) {
        if (pc.remoteDescription?.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
        } else {
          pendingIceCandidatesRef.current[fromId] = pendingIceCandidatesRef.current[fromId] || [];
          pendingIceCandidatesRef.current[fromId].push(signal.ice);
        }
      }
    } catch (err) {
      console.error("Error handling signal:", err);
    }
  };

  // Connect to socket server
  const connectToServer = () => {
    socketRef.current = io.connect(server_url);
    
    socketRef.current.on('connect', () => {
      socketIdRef.current = socketRef.current.id;
      console.log("Connected to server, socket ID:", socketIdRef.current);
      socketRef.current.emit('join-call', roomId, username);
    });
    
    socketRef.current.on('user-joined', (joinedUserId, participants = [], participantNames = {}) => {
      console.log("User joined:", joinedUserId, participants, participantNames);
      remoteUserNamesRef.current = participantNames || {};

      participants
        .filter(userId => userId !== socketIdRef.current)
        .forEach(userId => {
          upsertRemoteUser(userId, null, participantNames[userId]);
        });

      if (joinedUserId === socketIdRef.current) {
        participants
          .filter(userId => userId !== socketIdRef.current)
          .forEach(userId => {
            setTimeout(() => {
              createOffer(userId);
            }, 500);
          });
      }
    });

    socketRef.current.on('existing-users', (users = {}, names = {}) => {
      console.log("Existing users:", users, names);
      const userIds = Array.isArray(users) ? users : Object.keys(users);
      remoteUserNamesRef.current = { ...remoteUserNamesRef.current, ...names };

      userIds.forEach(userId => {
        if (userId !== socketIdRef.current) {
          upsertRemoteUser(userId, null, names[userId]);
          setTimeout(() => createOffer(userId), 500);
        }
      });
    });
    
    socketRef.current.on('user-left', (userId) => {
      console.log("User left:", userId);
      setRemoteUsers(prev => prev.filter(u => u.socketId !== userId));
      if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
      }
      delete pendingIceCandidatesRef.current[userId];
      delete remoteUserNamesRef.current[userId];
    });
    
    socketRef.current.on('signal', handleSignal);
    
    socketRef.current.on('chat-message', (msg, sender, senderId) => {
      if (senderId !== socketIdRef.current) {
        setMessages(prev => [...prev, {
          sender: sender,
          message: msg,
          timestamp: new Date().toLocaleTimeString()
        }]);
        setNewMessages(prev => prev + 1);
      }
    });
  };

  // Join meeting
  const joinMeeting = async () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    
    const stream = await startLocalStream();
    if (stream) {
      setIsJoined(true);
      connectToServer();
    }
  };

  // Leave meeting
  const leaveMeeting = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-call', roomId);
      socketRef.current.disconnect();
    }
    
    Object.values(peerConnections).forEach(pc => {
      if (pc) pc.close();
    });
    peerConnections = {};
    pendingIceCandidatesRef.current = {};
    remoteUserNamesRef.current = {};
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    window.location.href = '/';
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        Object.values(peerConnections).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        // Update local video
        if (localVideoRef.current && localStreamRef.current) {
          const newStream = new MediaStream();
          newStream.addTrack(videoTrack);
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) newStream.addTrack(audioTrack);
          localVideoRef.current.srcObject = newStream;
          localStreamRef.current = newStream;
        }
        
        videoTrack.onended = () => toggleScreenShare();
        setScreenSharing(true);
      } catch (err) {
        console.log("Screen share cancelled");
      }
    } else {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = cameraStream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      Object.values(peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Update local video
      if (localVideoRef.current && localStreamRef.current) {
        const newStream = new MediaStream();
        newStream.addTrack(videoTrack);
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) newStream.addTrack(audioTrack);
        localVideoRef.current.srcObject = newStream;
        localStreamRef.current = newStream;
      }
      
      setScreenSharing(false);
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit('chat-message', message.trim(), username);
      setMessages(prev => [...prev, {
        sender: username,
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString()
      }]);
      setMessage("");
    }
  };

  if (!isJoined) {
    return (
      <div className={style.lobbyContainer}>
        <div className={style.lobbyCard}>
          <h2 className={style.lobbyTitle}>Join Meeting 🎥</h2>
          <input 
            type="text"
            className={style.lobbyInput}
            placeholder="Enter your username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && joinMeeting()}
          />
          <button className={style.lobbyButton} onClick={joinMeeting}>
            Join Meeting
          </button>
          <div className={style.lobbyPreview}>
            <video ref={localPreviewRef} autoPlay muted playsInline></video>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={style.meetVideoContainer}>
      {/* Chat Panel */}
      {chatOpen && (
        <div className={style.chatRoom}>
          <div className={style.chatHeader}>
            <h3>💬 Chat</h3>
            <span className={style.closeChat} onClick={() => setChatOpen(false)}>×</span>
          </div>
          <div className={style.chatMessages} ref={chatDisplayRef}>
            {messages.length === 0 ? (
              <div className={style.noMessages}>💬 No messages yet</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`${style.messageWrapper} ${msg.sender === username ? style.ownMessage : style.otherMessage}`}>
                  {msg.sender !== username && <div className={style.messageSender}>{msg.sender}</div>}
                  <div className={style.messageBubble}>{msg.message}</div>
                  <div className={style.messageTime}>{msg.timestamp}</div>
                </div>
              ))
            )}
          </div>
          <div className={style.chatInputArea}>
            <input
              type="text"
              className={style.chatInput}
              placeholder="Type a message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
            />
            <button className={style.sendButton} onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={style.buttonContainers}>
        <IconButton onClick={toggleVideo} style={{ color: "white" }}>
          {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
        <IconButton onClick={leaveMeeting} style={{ color: "red" }}>
          <CallEndIcon />
        </IconButton>
        <IconButton onClick={toggleAudio} style={{ color: "white" }}>
          {audioEnabled ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
        <IconButton onClick={toggleScreenShare} style={{ color: "white" }}>
          {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </IconButton>
        <Badge badgeContent={newMessages} color="error">
          <IconButton onClick={() => setChatOpen(!chatOpen)} style={{ color: "white" }}>
            <ChatIcon />
          </IconButton>
        </Badge>
      </div>

      {/* Local Video */}
      <video 
        className={style.meetUserVideo} 
        ref={localVideoRef} 
        autoPlay 
        muted 
        playsInline
        onClick={() => setMaximizedVideo(maximizedVideo === 'local' ? null : 'local')}
      />

      {/* Remote Videos */}
      <div className={style.conferenceView}>
        {remoteUsers.map(user => (
          <div key={user.socketId} className={style.videoWrapper}>
            <video
              ref={ref => {
                if (ref && user.stream && ref.srcObject !== user.stream) {
                  ref.srcObject = user.stream;
                  ref.play().catch(e => console.log("Play error:", e));
                }
              }}
              className={maximizedVideo === user.socketId ? style.maximizedVideo : ''}
              autoPlay
              playsInline
              onClick={() => setMaximizedVideo(maximizedVideo === user.socketId ? null : user.socketId)}
            />
            <button 
              className={style.maximizeBtn}
              onClick={(e) => {
                e.stopPropagation();
                setMaximizedVideo(maximizedVideo === user.socketId ? null : user.socketId);
              }}
            >
              {maximizedVideo === user.socketId ? <CloseFullscreenIcon /> : <FullscreenIcon />}
            </button>
            <div className={style.usernameOverlay}>{user.username}</div>
          </div>
        ))}
      </div>

      {/* Info Bar */}
      <div className={style.infoBar}>
        Room: {roomId} | You: {username} | Participants: {remoteUsers.length + 1}
      </div>
    </div>
  );
}
