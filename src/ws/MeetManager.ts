import {User} from "./User";

export class MeetManager {
    meets: Map<string, User[]> = new Map();
    static instance: MeetManager;

    private constructor() {
        this.meets = new Map();
    }

    static getInstance(){
        if (!this.instance) {
            this.instance = new MeetManager();
        }
        return this.instance;
    }

    public addUserToRoom(roomId: string, user: User) {
        if (!this.meets.has(roomId)) {
            this.meets.set(roomId, []);
            return;
        }
        this.meets.get(roomId)?.push(user);
    }
    public removeUserFromRoom(roomId: string, user: User) {
        if (!this.meets.has(roomId)) {
            return;
        }
        const users = this.meets.get(roomId);
        if (users) {
            const index = users.indexOf(user);
            if (index > -1) {
                users.splice(index, 1);
            }
        }
    }
    public broadcast(message: any, user : User, meetId: string) {
        
        if (!this.meets.has(meetId)) {
            return;
        }
        this.meets.get(meetId)?.forEach((u) => {
            if (u.id !== user.id) {
                u.send(message);
            }
        });
        
    }
}