import dotenv from "dotenv";
dotenv.config({
    path : "./.env",
});
import { app } from "./app";
import http from "http";

const server = http.createServer(app);

import { WebSocketServer } from 'ws';
import { User } from "./ws/User";
const wss = new WebSocketServer({server});

wss.on('connection', (ws) => {
    const user = new User(ws);
    ws.on('error', console.error);
    user.send("Welcome to the WebSocket server!");
    
    ws.on('close', () => {
        user?.destroy();
    });
});

server.listen(3000);