let IS_PROD = false;
const localServer = `${window.location.protocol}//${window.location.hostname}:8000`;

const server = IS_PROD ?
    "https://video-call-929x.onrender.com" :

    localServer


export default server;
