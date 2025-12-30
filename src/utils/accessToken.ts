import * as zlib from 'zlib';
import * as crypto from 'crypto';

const VERSION_LENGTH = 3;
const APP_ID_LENGTH = 32;

const getVersion = (): string => {
    return '007';
};

interface PrivilegeMap {
    [key: number]: number;
}

interface ServiceMap {
    [key: number]: Service;
}

interface ServiceConstructor {
    new (...args: any[]): Service;
}

interface ServiceRegistry {
    [key: number]: ServiceConstructor;
}

abstract class Service {
    protected __type: number;
    protected __privileges: PrivilegeMap;

    constructor(service_type: number) {
        this.__type = service_type;
        this.__privileges = {};
    }

    private __pack_type(): Buffer {
        const buf =  ByteBuf();
        buf.putUint16(this.__type);
        return buf.pack();
    }

    private __pack_privileges(): Buffer {
        const buf =  ByteBuf();
        buf.putTreeMapUInt32(this.__privileges);
        return buf.pack();
    }

    service_type(): number {
        return this.__type;
    }

    add_privilege(privilege: number, expire: number): void {
        this.__privileges[privilege] = expire;
    }

    pack(): Buffer {
        return Buffer.concat([this.__pack_type(), this.__pack_privileges()]);
    }

    unpack(buffer: Buffer) {
        const bufReader =  ReadByteBuf(buffer);
        this.__privileges = bufReader.getTreeMapUInt32();
        return bufReader;
    }
}

const kRtcServiceType = 1;

class ServiceRtc extends Service {
    private __channel_name: string;
    private __uid: string;

    static readonly kPrivilegeJoinChannel = 1;
    static readonly kPrivilegePublishAudioStream = 2;
    static readonly kPrivilegePublishVideoStream = 3;
    static readonly kPrivilegePublishDataStream = 4;

    constructor(channel_name: string, uid: number | string) {
        super(kRtcServiceType);
        this.__channel_name = channel_name;
        this.__uid = uid === 0 ? '' : `${uid}`;
    }

    pack(): Buffer {
        const buffer =  ByteBuf();
        buffer.putString(this.__channel_name).putString(this.__uid);
        return Buffer.concat([super.pack(), buffer.pack()]);
    }

    unpack(buffer: Buffer) {
        const bufReader = super.unpack(buffer);
        this.__channel_name = bufReader.getString();
        this.__uid = bufReader.getString();
        return bufReader;
    }
}

const kRtmServiceType = 2;

class ServiceRtm extends Service {
    private __user_id: string;

    static readonly kPrivilegeLogin = 1;

    constructor(user_id?: string) {
        super(kRtmServiceType);
        this.__user_id = user_id || '';
    }

    pack(): Buffer {
        const buffer =  ByteBuf();
        buffer.putString(this.__user_id);
        return Buffer.concat([super.pack(), buffer.pack()]);
    }

    unpack(buffer: Buffer) {
        const bufReader = super.unpack(buffer);
        this.__user_id = bufReader.getString();
        return bufReader;
    }
}

const kFpaServiceType = 4;

class ServiceFpa extends Service {
    static readonly kPrivilegeLogin = 1;

    constructor() {
        super(kFpaServiceType);
    }

    pack(): Buffer {
        return super.pack();
    }

    unpack(buffer: Buffer) {
        const bufReader = super.unpack(buffer);
        return bufReader;
    }
}

const kChatServiceType = 5;

class ServiceChat extends Service {
    private __user_id: string;

    static readonly kPrivilegeUser = 1;
    static readonly kPrivilegeApp = 2;

    constructor(user_id?: string) {
        super(kChatServiceType);
        this.__user_id = user_id || '';
    }

    pack(): Buffer {
        const buffer = ByteBuf();
        buffer.putString(this.__user_id);
        return Buffer.concat([super.pack(), buffer.pack()]);
    }

    unpack(buffer: Buffer) {
        const bufReader = super.unpack(buffer);
        this.__user_id = bufReader.getString();
        return bufReader;
    }
}

const kApaasServiceType = 7;

class ServiceApaas extends Service {
    private __room_uuid: string;
    private __user_uuid: string;
    private __role: number;

    static readonly PRIVILEGE_ROOM_USER = 1;
    static readonly PRIVILEGE_USER = 2;
    static readonly PRIVILEGE_APP = 3;

    constructor(roomUuid?: string, userUuid?: string, role?: number) {
        super(kApaasServiceType);
        this.__room_uuid = roomUuid || '';
        this.__user_uuid = userUuid || '';
        this.__role = role || -1;
    }

    pack(): Buffer {
        const buffer =  ByteBuf();
        buffer.putString(this.__room_uuid);
        buffer.putString(this.__user_uuid);
        buffer.putInt16(this.__role);
        return Buffer.concat([super.pack(), buffer.pack()]);
    }

    unpack(buffer: Buffer) {
        const bufReader = super.unpack(buffer);
        this.__room_uuid = bufReader.getString();
        this.__user_uuid = bufReader.getString();
        this.__role = bufReader.getInt16();
        return bufReader;
    }
}

class AccessToken2 {
    appId: string;
    appCertificate: string;
    issueTs: number;
    expire: number;
    salt: number;
    services: ServiceMap;

    static kServices: ServiceRegistry = {};

    constructor(appId: string, appCertificate: string, issueTs?: number, expire?: number) {
        this.appId = appId;
        this.appCertificate = appCertificate;
        this.issueTs = issueTs || Math.floor(new Date().getTime() / 1000);
        this.expire = expire || 0;
        // salt ranges in (1, 99999999)
        this.salt = Math.floor(Math.random() * 99999999) + 1;
        this.services = {};
    }

    private __signing(): Buffer {
        let signing = encodeHMac( ByteBuf().putUint32(this.issueTs).pack(), this.appCertificate);
        signing = encodeHMac( ByteBuf().putUint32(this.salt).pack(), signing);
        return signing;
    }

    private __build_check(): boolean {
        const is_uuid = (data: string): boolean => {
            if (data.length !== APP_ID_LENGTH) {
                return false;
            }
            const buf = Buffer.from(data, 'hex');
            return !!buf;
        };

        const { appId, appCertificate, services } = this;
        if (!is_uuid(appId) || !is_uuid(appCertificate)) {
            return false;
        }

        if (Object.keys(services).length === 0) {
            return false;
        }
        return true;
    }

    add_service(service: Service): void {
        this.services[service.service_type()] = service;
    }

    build(): string {
        if (!this.__build_check()) {
            return '';
        }

        const signing = this.__signing();
        let signing_info = ByteBuf()
            .putString(this.appId)
            .putUint32(this.issueTs)
            .putUint32(this.expire)
            .putUint32(this.salt)
            .putUint16(Object.keys(this.services).length)
            .pack();

        Object.values(this.services).forEach(service => {
            signing_info = Buffer.concat([signing_info, service.pack()]);
        });

        const signature : any = encodeHMac(signing, signing_info);
        const content = Buffer.concat([ByteBuf().putString(signature).pack(), signing_info]);
        const compressed = zlib.deflateSync(content);
        return `${getVersion()}${Buffer.from(compressed).toString('base64')}`;
    }

    from_string(origin_token: string): boolean {
        const origin_version = origin_token.substring(0, VERSION_LENGTH);
        if (origin_version !== getVersion()) {
            return false;
        }

        const origin_content = origin_token.substring(VERSION_LENGTH, origin_token.length);
        const buffer = zlib.inflateSync(Buffer.from(origin_content, 'base64'));
        const bufferReader =  ReadByteBuf(buffer);

        const signature = bufferReader.getString();
        this.appId = bufferReader.getString();
        this.issueTs = bufferReader.getUint32();
        this.expire = bufferReader.getUint32();
        this.salt = bufferReader.getUint32();
        const service_count = bufferReader.getUint16();

        let remainBuf : any = bufferReader.pack();
        for (let i = 0; i < service_count; i+=1) {
            const bufferReaderService = ReadByteBuf(remainBuf);
            const service_type = bufferReaderService.getUint16();
            const service = new AccessToken2.kServices[service_type]();
            remainBuf = service.unpack(bufferReaderService.pack()).pack();
            this.services[service_type] = service;
        }

        return true;
    }
}

const encodeHMac = (key: Buffer | string, message: Buffer | string): Buffer => {
    return crypto.createHmac('sha256', key).update(message).digest();
};

interface ByteBufInterface {
    buffer: Buffer;
    position: number;
    pack(): Buffer;
    putUint16(v: number): ByteBufInterface;
    putUint32(v: number): ByteBufInterface;
    putInt32(v: number): ByteBufInterface;
    putInt16(v: number): ByteBufInterface;
    putBytes(bytes: Buffer): ByteBufInterface;
    putString(str: string): ByteBufInterface;
    putTreeMap(map: { [key: string]: string } | null): ByteBufInterface;
    putTreeMapUInt32(map: PrivilegeMap | null): ByteBufInterface;
}

 function ByteBuf () {
    const that: ByteBufInterface = {
        buffer: Buffer.alloc(1024),
        position: 0,

        pack(): Buffer {
            const out = Buffer.alloc(that.position);
            that.buffer.copy(out, 0, 0, out.length);
            return out;
        },

        putUint16(v: number): ByteBufInterface {
            that.buffer.writeUInt16LE(v, that.position);
            that.position += 2;
            return that;
        },

        putUint32(v: number): ByteBufInterface {
            that.buffer.writeUInt32LE(v, that.position);
            that.position += 4;
            return that;
        },

        putInt32(v: number): ByteBufInterface {
            that.buffer.writeInt32LE(v, that.position);
            that.position += 4;
            return that;
        },

        putInt16(v: number): ByteBufInterface {
            that.buffer.writeInt16LE(v, that.position);
            that.position += 2;
            return that;
        },

        putBytes(bytes: Buffer): ByteBufInterface {
            that.putUint16(bytes.length);
            bytes.copy(that.buffer, that.position);
            that.position += bytes.length;
            return that;
        },

        putString(str: string): ByteBufInterface {
            return that.putBytes(Buffer.from(str));
        },

        putTreeMap(map: { [key: string]: string } | null): ByteBufInterface {
            if (!map) {
                that.putUint16(0);
                return that;
            }

            that.putUint16(Object.keys(map).length);
            for (const key in map) {
                that.putUint16(parseInt(key));
                that.putString(map[key]);
            }

            return that;
        },

        putTreeMapUInt32(map: PrivilegeMap | null): ByteBufInterface {
            if (!map) {
                that.putUint16(0);
                return that;
            }

            that.putUint16(Object.keys(map).length);
            for (const key in map) {
                that.putUint16(parseInt(key));
                that.putUint32(map[key]);
            }

            return that;
        }
    };

    that.buffer.fill(0);
    return that;
};

interface ReadByteBufInterface {
    buffer: Buffer;
    position: number;
    getUint16(): number;
    getUint32(): number;
    getInt16(): number;
    getString(): string;
    getTreeMapUInt32(): PrivilegeMap;
    pack(): Buffer;
}

    function ReadByteBuf (bytes: Buffer) {
    const that: ReadByteBufInterface = {
        buffer: bytes,
        position: 0,

        getUint16(): number {
            const ret = that.buffer.readUInt16LE(that.position);
            that.position += 2;
            return ret;
        },

        getUint32(): number {
            const ret = that.buffer.readUInt32LE(that.position);
            that.position += 4;
            return ret;
        },

        getInt16(): number {
            const ret = that.buffer.readInt16LE(that.position);
            that.position += 2;
            return ret;
        },

        getString(): string {
            const len = that.getUint16();
            const out = Buffer.alloc(len);
            that.buffer.copy(out, 0, that.position, that.position + len);
            that.position += len;
            return out.toString();
        },

        getTreeMapUInt32(): PrivilegeMap {
            const map: PrivilegeMap = {};
            const len = that.getUint16();
            for (let i = 0; i < len; i++) {
                const key = that.getUint16();
                const value = that.getUint32();
                map[key] = value;
            }
            return map;
        },

        pack(): Buffer {
            const length = that.buffer.length;
            const out = Buffer.alloc(length);
            that.buffer.copy(out, 0, that.position, length);
            return out;
        }
    };

    return that;
};

// Initialize service registry
AccessToken2.kServices[kApaasServiceType] = ServiceApaas;
AccessToken2.kServices[kChatServiceType] = ServiceChat;
AccessToken2.kServices[kFpaServiceType] = ServiceFpa;
AccessToken2.kServices[kRtcServiceType] = ServiceRtc;
AccessToken2.kServices[kRtmServiceType] = ServiceRtm;

export {
    AccessToken2,
    kApaasServiceType,
    kChatServiceType,
    kFpaServiceType,
    kRtcServiceType,
    kRtmServiceType,
    ServiceApaas,
    ServiceChat,
    ServiceFpa,
    ServiceRtc,
    ServiceRtm,
};