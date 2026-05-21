const deployedServer = "https://video-call-app-2mgc.onrender.com";
const localServer = "http://localhost:10000";

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const server =
  import.meta.env.VITE_BACKEND_URL ||
  (isLocalhost ? localServer : deployedServer);

export const authApiUrl = `${server}/api/auth`;
export default server;
