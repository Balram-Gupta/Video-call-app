const deployedServer = "https://video-call-app-2mgc.onrender.com";
const localServer = "http://localhost:8000";

const server = localServer || deployedServer;

export const authApiUrl = `${server}/api/auth`;
export default server;
