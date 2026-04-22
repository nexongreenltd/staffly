/**
 * ZKTeco TCP/IP Client
 *
 * Implements the ZKTeco binary protocol over TCP (port 4370).
 * Tested with ZKTeco K40, F22, UA300 and compatible devices.
 *
 * Packet format (TCP):
 *   [4-byte size LE][CMD:2][CHECKSUM:2][SESSION_ID:2][REPLY_ID:2][DATA:variable]
 *
 * ZKTeco time encoding: seconds since 2000-01-01 00:00:00
 *   encoded as: ((Y-2000)*12*32 + (M-1)*32 + (D-1)) * 86400 + H*3600 + Min*60 + S
 */

import * as net from 'net';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  ZKDevice, ZKAttendanceRecord, ZKUser, ZKDeviceInfo, ZKCommand,
} from './zkteco.types';

const HEADER_SIZE = 8;          // CMD(2) + CHECKSUM(2) + SESSION_ID(2) + REPLY_ID(2)
const TCP_PREFIX_SIZE = 4;      // size prefix for TCP framing

export class ZKTecoClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private sessionId = 0;
  private replyId = -1;
  private connected = false;
  private pendingResolve: ((data: Buffer) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private receiveBuffer = Buffer.alloc(0);

  constructor(private readonly device: ZKDevice) {
    super();
    device.timeout = device.timeout || 10000;
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(this.device.timeout);

      socket.on('data', (data) => this.handleData(data));
      socket.on('error', (err) => {
        if (this.pendingReject) this.pendingReject(err);
        this.emit('error', err);
      });
      socket.on('timeout', () => {
        const err = new Error(`Connection to ${this.device.ip}:${this.device.port} timed out`);
        socket.destroy(err);
        if (this.pendingReject) this.pendingReject(err);
      });
      socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      socket.connect(this.device.port, this.device.ip, async () => {
        this.socket = socket;
        try {
          await this.sendCommand(ZKCommand.CMD_CONNECT);
          this.connected = true;
          this.emit('connected');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.sendCommand(ZKCommand.CMD_EXIT);
    } catch (_) {}
    this.socket?.destroy();
    this.socket = null;
    this.connected = false;
  }

  // ─── Data fetching ───────────────────────────────────────────────────────────

  async getAttendanceLogs(): Promise<ZKAttendanceRecord[]> {
    const rawData = await this.readLargeData(ZKCommand.CMD_GET_ATTLOG);
    return this.parseAttendanceLogs(rawData);
  }

  async getUsers(): Promise<ZKUser[]> {
    const rawData = await this.readLargeData(ZKCommand.CMD_GET_USERINFO);
    return this.parseUsers(rawData);
  }

  async getDeviceInfo(): Promise<Partial<ZKDeviceInfo>> {
    try {
      const [serialNumber, platform, firmwareVersion, deviceName] = await Promise.all([
        this.getOption('~SerialNumber'),
        this.getOption('~Platform'),
        this.getOption('~FirmwareVersion'),
        this.getOption('~DeviceName'),
      ]);
      return { serialNumber, platform, firmwareVersion, deviceName };
    } catch (err) {
      logger.warn('Could not fetch full device info', { error: err.message });
      return {};
    }
  }

  async getOption(key: string): Promise<string> {
    const buf = Buffer.from(key + '\0');
    const reply = await this.sendCommand(ZKCommand.CMD_OPTIONS_RRQ, buf);
    const str = reply.toString('ascii');
    const parts = str.split('=');
    return parts.length > 1 ? parts[1].replace(/\0/g, '') : '';
  }

  // ─── User management ─────────────────────────────────────────────────────────

  async setUser(user: ZKUser): Promise<void> {
    const buf = Buffer.alloc(28 + user.name.length + 1);
    let offset = 0;

    buf.writeUInt16LE(user.uid, offset); offset += 2;
    buf.writeUInt8(user.role, offset); offset += 1;

    const passBuf = Buffer.from(user.password.padEnd(8, '\0').slice(0, 8));
    passBuf.copy(buf, offset); offset += 8;

    const nameBuf = Buffer.from(user.name.padEnd(24, '\0').slice(0, 24), 'ascii');
    nameBuf.copy(buf, offset); offset += 24;

    buf.writeUInt8(1, offset); offset += 1; // card enabled
    const cardBuf = Buffer.from(user.cardNo.padEnd(4, '\0').slice(0, 4));
    cardBuf.copy(buf, offset);

    await this.sendCommand(ZKCommand.CMD_SET_USERINFO, buf);
  }

  async deleteUser(uid: number): Promise<void> {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(uid, 0);
    await this.sendCommand(ZKCommand.CMD_DELETE_USER, buf);
  }

  async enableDevice(): Promise<void> {
    await this.sendCommand(ZKCommand.CMD_ENABLEDEVICE);
  }

  async disableDevice(): Promise<void> {
    await this.sendCommand(ZKCommand.CMD_DISABLEDEVICE);
  }

  // ─── Low-level protocol ──────────────────────────────────────────────────────

  private buildPacket(cmd: ZKCommand, data: Buffer = Buffer.alloc(0)): Buffer {
    this.replyId = (this.replyId + 1) & 0xFFFF;

    const payloadSize = HEADER_SIZE + data.length;
    const packet = Buffer.alloc(TCP_PREFIX_SIZE + payloadSize);

    // TCP size prefix (little-endian)
    packet.writeUInt32LE(payloadSize, 0);

    // Command
    packet.writeUInt16LE(cmd, TCP_PREFIX_SIZE);

    // Checksum placeholder (filled in after)
    packet.writeUInt16LE(0, TCP_PREFIX_SIZE + 2);

    // Session ID
    packet.writeUInt16LE(this.sessionId, TCP_PREFIX_SIZE + 4);

    // Reply ID
    packet.writeUInt16LE(this.replyId, TCP_PREFIX_SIZE + 6);

    // Data
    if (data.length > 0) data.copy(packet, TCP_PREFIX_SIZE + HEADER_SIZE);

    // Calculate checksum over the header+data
    const checksum = this.calcChecksum(packet, TCP_PREFIX_SIZE);
    packet.writeUInt16LE(checksum, TCP_PREFIX_SIZE + 2);

    return packet;
  }

  private calcChecksum(buf: Buffer, offset: number): number {
    let sum = 0;
    for (let i = offset; i < buf.length; i += 2) {
      const word = i + 1 < buf.length
        ? buf.readUInt16LE(i)
        : buf[i];
      sum += word;
    }
    while (sum > 0xFFFF) {
      sum = (sum >> 16) + (sum & 0xFFFF);
    }
    return (~sum) & 0xFFFF;
  }

  private sendCommand(cmd: ZKCommand, data?: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket && cmd !== ZKCommand.CMD_CONNECT) {
        return reject(new Error('Socket not connected'));
      }

      const packet = this.buildPacket(cmd, data);
      const timeout = setTimeout(() => {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error(`Command ${cmd} timed out`));
      }, this.device.timeout);

      this.pendingResolve = (responseData: Buffer) => {
        clearTimeout(timeout);
        this.pendingResolve = null;
        this.pendingReject = null;

        const replyCmd = responseData.readUInt16LE(0);
        if (replyCmd === ZKCommand.CMD_ACK_OK || replyCmd === ZKCommand.CMD_ACK_DATA) {
          // Extract session ID on connect
          if (cmd === ZKCommand.CMD_CONNECT) {
            this.sessionId = responseData.readUInt16LE(4);
          }
          const responsePayload = responseData.slice(HEADER_SIZE);
          resolve(responsePayload);
        } else if (replyCmd === ZKCommand.CMD_ACK_ERROR) {
          reject(new Error(`Device returned error for command ${cmd}`));
        } else {
          // For prepare-data responses, still resolve
          resolve(responseData.slice(HEADER_SIZE));
        }
      };

      this.pendingReject = (err: Error) => {
        clearTimeout(timeout);
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(err);
      };

      if (this.socket) {
        this.socket.write(packet);
      } else {
        // During connect, socket is being set up — use a temp socket ref
        reject(new Error('Socket unavailable'));
      }
    });
  }

  private handleData(chunk: Buffer) {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);

    while (this.receiveBuffer.length >= TCP_PREFIX_SIZE) {
      const payloadSize = this.receiveBuffer.readUInt32LE(0);
      const totalSize = TCP_PREFIX_SIZE + payloadSize;

      if (this.receiveBuffer.length < totalSize) break;

      const frame = this.receiveBuffer.slice(TCP_PREFIX_SIZE, totalSize);
      this.receiveBuffer = this.receiveBuffer.slice(totalSize);

      if (this.pendingResolve) {
        this.pendingResolve(frame);
      }
    }
  }

  private async readLargeData(cmd: ZKCommand): Promise<Buffer> {
    const sizeReply = await this.sendCommand(cmd);

    // Response can be CMD_PREPARE_DATA with size, or direct CMD_ACK_DATA
    const fullData: Buffer[] = [];

    // Issue CMD_ACK_OK to trigger data send
    let dataReply = await this.sendCommand(ZKCommand.CMD_ACK_OK);

    // Keep reading until we get CMD_FREE_DATA signal or all chunks collected
    while (dataReply.length > 0) {
      fullData.push(dataReply);
      try {
        dataReply = await this.sendCommandWithTimeout(ZKCommand.CMD_ACK_OK, undefined, 2000);
      } catch (_) {
        break;
      }
    }

    return Buffer.concat(fullData);
  }

  private sendCommandWithTimeout(
    cmd: ZKCommand,
    data?: Buffer,
    timeout?: number,
  ): Promise<Buffer> {
    const savedTimeout = this.device.timeout;
    this.device.timeout = timeout || savedTimeout;
    return this.sendCommand(cmd, data).finally(() => {
      this.device.timeout = savedTimeout;
    });
  }

  // ─── Data parsers ────────────────────────────────────────────────────────────

  private parseAttendanceLogs(buf: Buffer): ZKAttendanceRecord[] {
    const records: ZKAttendanceRecord[] = [];
    const RECORD_SIZE = 40;

    for (let i = 0; i + RECORD_SIZE <= buf.length; i += RECORD_SIZE) {
      const rec = buf.slice(i, i + RECORD_SIZE);
      try {
        const uid = rec.readUInt16LE(0);
        const inoutMode = rec.readUInt8(2);
        const verifyMode = rec.readUInt8(3);
        const timeInt = rec.readUInt32LE(4);
        const userId = rec.slice(8, 20).toString('ascii').replace(/\0/g, '').trim();

        const attTime = this.decodeTime(timeInt);
        if (!attTime) continue;

        records.push({ uid, userId, attTime, verifyMode, inoutMode, reserved: 0 });
      } catch (err) {
        logger.warn('Error parsing attendance record', { offset: i, error: err.message });
      }
    }

    return records;
  }

  private parseUsers(buf: Buffer): ZKUser[] {
    const users: ZKUser[] = [];
    const USER_RECORD_SIZE = 72;

    for (let i = 0; i + USER_RECORD_SIZE <= buf.length; i += USER_RECORD_SIZE) {
      const rec = buf.slice(i, i + USER_RECORD_SIZE);
      try {
        const uid = rec.readUInt16LE(0);
        const role = rec.readUInt8(2);
        const password = rec.slice(3, 11).toString('ascii').replace(/\0/g, '');
        const name = rec.slice(11, 35).toString('ascii').replace(/\0/g, '').trim();
        const cardNo = rec.readUInt32LE(35).toString();
        const userId = rec.slice(48, 57).toString('ascii').replace(/\0/g, '').trim();
        users.push({ uid, userId, name, cardNo, role, password });
      } catch (err) {
        logger.warn('Error parsing user record', { offset: i, error: err.message });
      }
    }

    return users;
  }

  // ZKTeco time format: seconds since 2000-01-01
  private decodeTime(t: number): Date | null {
    try {
      const second = t % 60; t = Math.floor(t / 60);
      const minute = t % 60; t = Math.floor(t / 60);
      const hour   = t % 24; t = Math.floor(t / 24);
      const day    = t % 31 + 1; t = Math.floor(t / 31);
      const month  = t % 12 + 1; t = Math.floor(t / 12);
      const year   = t + 2000;

      if (year < 2000 || year > 2100) return null;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;

      return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    } catch {
      return null;
    }
  }

  static encodeTime(date: Date): number {
    const y = date.getUTCFullYear() - 2000;
    const m = date.getUTCMonth();      // 0-based
    const d = date.getUTCDate() - 1;
    const h = date.getUTCHours();
    const min = date.getUTCMinutes();
    const s = date.getUTCSeconds();
    return ((y * 12 + m) * 31 + d) * 86400 + h * 3600 + min * 60 + s;
  }
}
