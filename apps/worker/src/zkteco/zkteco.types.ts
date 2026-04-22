export interface ZKDevice {
  ip: string;
  port: number;
  timeout?: number;
}

export interface ZKAttendanceRecord {
  uid: number;         // Device internal user ID
  userId: string;      // User ID as string (may differ from uid)
  attTime: Date;
  verifyMode: number;  // 0=password, 1=fingerprint, 4=card, 8=face
  inoutMode: number;   // 0=check-in, 1=check-out, 4=OT-in, 5=OT-out
  reserved: number;
}

export interface ZKUser {
  uid: number;
  userId: string;
  name: string;
  cardNo: string;
  role: number;  // 0=user, 14=admin
  password: string;
}

export interface ZKDeviceInfo {
  serialNumber: string;
  platform: string;
  firmwareVersion: string;
  deviceName: string;
  userCount: number;
  fingerprintCount: number;
  recordCount: number;
}

// ZKTeco protocol command codes
export enum ZKCommand {
  CMD_CONNECT          = 1000,
  CMD_EXIT             = 1001,
  CMD_ENABLEDEVICE     = 1002,
  CMD_DISABLEDEVICE    = 1003,
  CMD_ACK_OK           = 2000,
  CMD_ACK_ERROR        = 2001,
  CMD_ACK_DATA         = 2002,
  CMD_PREPARE_DATA     = 1500,
  CMD_DATA             = 1501,
  CMD_FREE_DATA        = 1502,
  CMD_GET_ATTLOG       = 13,
  CMD_CLEAR_ATTLOG     = 15,
  CMD_GET_USERINFO     = 9,
  CMD_SET_USERINFO     = 8,
  CMD_DELETE_USER      = 18,
  CMD_GET_TIME         = 201,
  CMD_SET_TIME         = 202,
  CMD_OPTIONS_RRQ      = 11,
  CMD_OPTIONS_WRQ      = 12,
  CMD_DEVICE_INFO      = 11,
  CMD_VERSION          = 1100,
  CMD_RESTART          = 1004,
}
