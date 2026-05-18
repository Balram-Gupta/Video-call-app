const deployedServer = "https://video-call-app-2mgc.onrender.com";
const localServer = `${window.location.protocol}//${window.location.hostname}:8000`;

const server = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? deployedServer : localServer);

export const authApiUrl = `${server}/api/auth`;
export default server;
