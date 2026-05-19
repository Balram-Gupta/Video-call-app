const deployedServer = "https://video-call-app-2mgc.onrender.com";
const localServer = "http://localhost:8000";

const server =   deployedServer || localServer;

export const authApiUrl = `${server}/api/auth`;
export default server;
