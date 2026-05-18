let IS_PROD = true;

const localServer = `${window.location.protocol}//${window.location.hostname}:8000`;

const server = IS_PROD
  ? "https://video-call-app-2mgc.onrender.com"
  : localServer;

export default server;