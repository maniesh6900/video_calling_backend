import dotenv from "dotenv";
dotenv.config({
    path : "./.env",
});
import { app } from "./app";

app.listen(3000);

import { WebSocketServer } from 'ws';
import { User } from "./ws/User";
const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {
    const user = new User(ws);
    ws.on('error', console.error);
    user.send("Welcome to the WebSocket server!");
    
    ws.on('close', () => {
        user?.destroy();
    });
});