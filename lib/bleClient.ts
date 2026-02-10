import { z } from "zod";

const MAIN_SERVICE_UUID = "a61d1283-f877-41b5-bb7b-cf28d0c6e883";
const STATUS_UUID = "08fbea13-2bf0-44ac-bca1-2642347689bb";
const BRIGHTNESS_UUID = "c227bf28-0fe4-4861-8741-83a0d6ad7e3d";

const ZONE_SERVICE_UUID = "e9ea5811-bc29-4cf1-9d02-456a5a23dff3";
const ALLZONES_UUID = "b7b0b16d-2cd6-48f8-aa2d-4cd06723c807";
const ADDZONE_UUID = "c3e1efa6-4cc5-4c96-b212-75b96138682d";
const EDITZONE_UUID = "c1cc8a66-50f8-4c1a-bac3-c5ca076a13e2";

const ZONENAMES_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const MODE_SERVICE_UUID = "f427308f-a5e0-4ff6-8717-df822d42ada8";
const EDITMODE_UUID = "0508dcb3-840c-40db-8c2a-2fc5428627f2";
const GETMODES_UUID = "4c65329e-aa86-448c-b90e-f616ce07ff08";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// --- Schemas ---

const statusSchema = z.string().transform((value, ctx) => {
  const norm = value.trim().toLowerCase();
  if (norm === "true") return true;
  if (norm === "false") return false;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Invalid status value",
  });
  return z.NEVER;
});

const brightnessSchema = z.string().transform((value, ctx) => {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid brightness value",
    });
    return z.NEVER;
  }
  return Math.min(255, Math.max(0, parsed));
});

const colorSchema = z.tuple([z.number(), z.number(), z.number()]);

const modeSchema = z.object({
  key: z.string(),
  type: z.string(), // "static" | "fade" | "pulse" | "rainbow" | "fire"
  speed: z.number(),
  colors: z.array(colorSchema),
  colorLength: z.number().optional(),
  start: z.number().optional(), // C++ returns these in currentMode too
  end: z.number().optional(),
});

export const zoneSchema = z.object({
  name: z.string(),
  key: z.string(),
  start: z.number(),
  end: z.number(),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true"),
  currentMode: modeSchema.nullable().optional(),
});

const allZonesResponseSchema = z.object({
  data: z.array(zoneSchema),
  length: z.number(),
});

const zoneNameEntrySchema = z.object({
  name: z.string(),
  key: z.string(),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true"),
});

const zoneNamesResponseSchema = z.object({
  data: z.array(zoneNameEntrySchema),
  length: z.number(),
});

// --- Types ---

export type Zone = z.infer<typeof zoneSchema>;
export type Mode = z.infer<typeof modeSchema>;
export type ZoneNameEntry = z.infer<typeof zoneNameEntrySchema>;
export type Color = [number, number, number];

export type EditModePayload = {
  key: string;       // Zone Key
  type: "editCurrentMode" | "setCurrentToNull";
  mode: {
    key: string;     // Mode Key (often just random string)
    type: string;    // Mode type
    speed: number;
    colors: Color[];
    colorLength: number;
    isActive: "true"; // C++ seems to expect string here
  };
};

// --- Client ---

function parseText(view: DataView): string {
  return decoder.decode(view).trim();
}

class BleClient {
  private device: BluetoothDevice | null = null;
  
  private statusChar: BluetoothRemoteGATTCharacteristic | null = null;
  private brightnessChar: BluetoothRemoteGATTCharacteristic | null = null;
  
  private allZonesChar: BluetoothRemoteGATTCharacteristic | null = null;
  private addZoneChar: BluetoothRemoteGATTCharacteristic | null = null;
  private editZoneChar: BluetoothRemoteGATTCharacteristic | null = null;
  private zoneNamesChar: BluetoothRemoteGATTCharacteristic | null = null;
  
  private editModeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private getModesChar: BluetoothRemoteGATTCharacteristic | null = null;

  private ensureSupported(): void {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      throw new Error("Web Bluetooth API is disabled.");
    }
  }

  private ensureConnected(): void {
    if (!this.device || !this.statusChar) {
      throw new Error("Device is not connected.");
    }
  }

  private async bindDevice(device: BluetoothDevice) {
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("Unable to connect to GATT server.");
    }

    // Main Service
    const mainService = await server.getPrimaryService(MAIN_SERVICE_UUID);
    this.statusChar = await mainService.getCharacteristic(STATUS_UUID);
    this.brightnessChar = await mainService.getCharacteristic(BRIGHTNESS_UUID);

    // Zone Service
    const zoneService = await server.getPrimaryService(ZONE_SERVICE_UUID);
    this.allZonesChar = await zoneService.getCharacteristic(ALLZONES_UUID);
    this.addZoneChar = await zoneService.getCharacteristic(ADDZONE_UUID);
    this.editZoneChar = await zoneService.getCharacteristic(EDITZONE_UUID);
    this.zoneNamesChar = await zoneService.getCharacteristic(ZONENAMES_UUID);

    // Mode Service
    const modeService = await server.getPrimaryService(MODE_SERVICE_UUID);
    this.editModeChar = await modeService.getCharacteristic(EDITMODE_UUID);
    this.getModesChar = await modeService.getCharacteristic(GETMODES_UUID);

    this.device = device;

    // Initial Read
    const statusValue = await this.statusChar.readValue();
    const isOn = statusSchema.parse(parseText(statusValue));
    
    const brightnessValue = await this.brightnessChar.readValue();
    const brightness = brightnessSchema.parse(parseText(brightnessValue));

    return {
      isOn,
      brightness,
      deviceName: device.name ?? "BLE device",
    };
  }

  async connect(): Promise<{ isOn: boolean; brightness: number; deviceName: string }> {
    this.ensureSupported();
    const device = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [MAIN_SERVICE_UUID] }],
      optionalServices: [MAIN_SERVICE_UUID, ZONE_SERVICE_UUID, MODE_SERVICE_UUID],
    });
    return this.bindDevice(device);
  }

  async autoConnect(): Promise<{ isOn: boolean; brightness: number; deviceName: string }> {
    this.ensureSupported();
    const devices = await navigator.bluetooth!.getDevices();
    if (devices.length === 0) {
      throw new Error("No known devices found.");
    }
    return this.bindDevice(devices[0]);
  }

  async setPower(value: boolean): Promise<void> {
    this.ensureConnected();
    await this.statusChar!.writeValue(encoder.encode(value ? "true" : "false"));
  }

  async setBrightness(value: number): Promise<void> {
    this.ensureConnected();
    await this.brightnessChar!.writeValue(encoder.encode(String(value)));
  }

  async getZones(): Promise<Zone[]> {
    this.ensureConnected();
    const value = await this.allZonesChar!.readValue();
    const text = parseText(value);
    
    // Sometimes BLE devices send partial data or chunks, but for now assuming one valid JSON blob
    const json = JSON.parse(text);
    const parsed = allZonesResponseSchema.parse(json);
    return parsed.data;
  }

  async addZone(name: string, start: number, end: number): Promise<void> {
    this.ensureConnected();
    const key = Math.random().toString(36).substring(7); // Simple random key
    const payload = JSON.stringify({ name, key, start, end });
    await this.addZoneChar!.writeValue(encoder.encode(payload));
  }

  async editZone(key: string, name: string, start: number, end: number, isActive: boolean): Promise<void> {
    this.ensureConnected();
    const payload = JSON.stringify({
      name,
      key,
      start,
      end,
      isActive: isActive ? "true" : "false",
    });
    await this.editZoneChar!.writeValue(encoder.encode(payload));
  }

  async setZoneMode(zoneKey: string, type: string, speed: number, colors: Color[]): Promise<void> {
    this.ensureConnected();
    const modeKey = Math.random().toString(36).substring(7);
    const payload: EditModePayload = {
      key: zoneKey,
      type: "editCurrentMode",
      mode: {
        key: modeKey,
        type,
        speed,
        colors,
        colorLength: colors.length,
        isActive: "true"
      }
    };
    await this.editModeChar!.writeValue(encoder.encode(JSON.stringify(payload)));
  }

  async clearZoneMode(zoneKey: string): Promise<void> {
    this.ensureConnected();
    const payload = {
      key: zoneKey,
      type: "setCurrentToNull",
    };
    await this.editModeChar!.writeValue(encoder.encode(JSON.stringify(payload)));
  }

  async getZoneNames(): Promise<ZoneNameEntry[]> {
    this.ensureConnected();
    const value = await this.zoneNamesChar!.readValue();
    const text = parseText(value);
    const json = JSON.parse(text);
    const parsed = zoneNamesResponseSchema.parse(json);
    return parsed.data;
  }

  async getZoneDetails(key: string): Promise<Zone> {
    this.ensureConnected();
    await this.getModesChar!.writeValue(encoder.encode(key));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const value = await this.getModesChar!.readValue();
    const text = parseText(value);
    const json = JSON.parse(text);
    return zoneSchema.parse(json);
  }
}

let client: BleClient | null = null;

export function getBleClient(): BleClient {
  if (!client) {
    client = new BleClient();
  }
  return client;
}
