import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}
let userNames = {}

const normalizeOrigin = (origin) => origin?.replace(/\/$/, "")
const allowedOrigins = [
    "https://video-call-app-frontend-l30w.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
]
    .map(normalizeOrigin)
    .filter(Boolean)

const getRoomKey = (path) => {
    if (!path) return ""

    try {
        const parsedUrl = new URL(path)
        return parsedUrl.pathname.replace(/^\/+/, "")
    } catch {
        return String(path).replace(/^\/+/, "")
    }
}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
                    callback(null, true)
                    return
                }

                callback(new Error(`Socket CORS blocked origin: ${origin}`))
            },
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path, username) => {
            const roomKey = getRoomKey(path)

            if (connections[roomKey] === undefined) {
                connections[roomKey] = []
            }
            if (!connections[roomKey].includes(socket.id)) {
                connections[roomKey].push(socket.id)
            }

            timeOnline[socket.id] = new Date();
            userNames[socket.id] = username || "Participant";

            // connections[path].forEach(elem => {
            //     io.to(elem)
            // })

            const roomUserNames = connections[roomKey].reduce((names, clientId) => {
                names[clientId] = userNames[clientId] || "Participant"
                return names
            }, {})

            for (let a = 0; a < connections[roomKey].length; a++) {
                io.to(connections[roomKey][a]).emit("user-joined", socket.id, connections[roomKey], roomUserNames)
            }

            if (messages[roomKey] !== undefined) {
                for (let a = 0; a < messages[roomKey].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[roomKey][a]['data'],
                        messages[roomKey][a]['sender'], messages[roomKey][a]['socket-id-sender'])
                }
            }

        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }

                        delete userNames[socket.id]
                    }
                }
            }
        })
    })
    return io;
}
