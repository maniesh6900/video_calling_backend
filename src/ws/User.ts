import WebSocket from "ws";
import { MeetManager } from "./MeetManager";

function getRandomString(n : number) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < n; i+=1)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

export class User {
    public id: any;
    private ws: WebSocket;
    private meetId: any;
    private userId: any;

    constructor(ws : WebSocket) {
        this.id = getRandomString(10);
        this.ws = ws;
        this.initHandler();
    }

    initHandler() {
        this.ws.on('message',async (data) => {
            const msg = JSON.parse(data.toString());
            console.log("msg");
            console.log(msg);
            switch (msg.type) {
                case "join":
                    this.meetId = msg.payload.meetId;
                    this.userId = msg.payload._uid;
                    
                    MeetManager.getInstance().addUserToRoom(this.meetId!, this);
                    MeetManager.getInstance().broadcast({
                        type: "joined",
                        payload: {
                            userId: this.userId,
                        },
                    }, this, this.meetId!);
                    // this.ws.send(JSON.stringify("joined-meet"));
                    // create a second server for uploading files(recording)
                    this.send({
                        type : "joined",
                        payload : {
                            userId : this.id,
                            meetId  : this.meetId,
                        },
                        user :  MeetManager.getInstance().meets.get(this.meetId)?.filter(x => x.id !== this.id)?.map((u) => ({ id: u.id })) ?? [],
                    });
                    MeetManager.getInstance().broadcast({
                        type: "user-joined",
                        payload: {
                            userId: this.id,
                            meetId : this.meetId,
                        },
                    }, this, this.meetId!);
                    break;
                case "user-left":
                    MeetManager.getInstance().removeUserFromRoom(this.meetId!, this);
                    MeetManager.getInstance().broadcast({
                        type: "user-left",
                        payload: {
                            userId: this.userId,
                        }, 
                    }, this, this.meetId!);
                    this.destroy();
                    break;
                // case "video" : 
                //     console.log(msg.users);
                // break;
                    
            }
        }); 
    }
    send(message: any) {
        this.ws.send(JSON.stringify(message)); 
    }

    destroy() {
        MeetManager.getInstance().broadcast({
            type: "user-left",
            payload: {
                userId: this.userId,
            },
        }, this, this.meetId!);
        MeetManager.getInstance().removeUserFromRoom(this.meetId!, this);
    }
}