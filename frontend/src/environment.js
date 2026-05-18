// environment.js
const deployedServer = "https://video-call-app-2mgc.onrender.com";

// Force use deployed server
const server = deployedServer;

export const authApiUrl = `${server}/api/auth`;
export default server;