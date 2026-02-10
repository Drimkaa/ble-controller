import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    getBleClient,
    type Zone,
    type ZoneNameEntry,
    type Color,
} from "../lib/bleClient";

const LOG_LIMIT = 6;

function pushLog(state: BleState, message: string) {
    state.logs.unshift(message);
    if (state.logs.length > LOG_LIMIT) {
        state.logs.pop();
    }
}

export type BleState = {
    supportsBle: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    isOn: boolean;
    brightness: number;
    zones: Zone[];
    zoneNames: ZoneNameEntry[];
    selectedZoneKey: string | null;
    selectedZoneDetails: Zone | null;
    isLoadingZones: boolean;
    error: string | null;
    logs: string[];
    // Optimistic update rollback data
    rollbackZones: Zone[] | null;
    rollbackZoneNames: ZoneNameEntry[] | null;
};

const initialState: BleState = {
    supportsBle: false,
    isConnected: false,
    isConnecting: false,
    isOn: false,
    brightness: 20,
    zones: [],
    zoneNames: [],
    selectedZoneKey: null,
    selectedZoneDetails: null,
    isLoadingZones: false,
    error: null,
    logs: [],
    rollbackZones: null,
    rollbackZoneNames: null,
};

export const getZones = createAsyncThunk<Zone[], void, { rejectValue: string }>(
    "ble/getZones",
    async (_, { rejectWithValue }) => {
        try {
            const client = getBleClient();
            return await client.getZones();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to fetch zones.";
            return rejectWithValue(message);
        }
    }
);

export const loadAllZoneDetails = createAsyncThunk<Zone[], void, { rejectValue: string }>(
    "ble/loadAllZoneDetails",
    async (_, { rejectWithValue }) => {
        try {
            const client = getBleClient();
            // First get zone names (lightweight)
            const zoneNames = await client.getZoneNames();
            // Then get details for each zone
            const zones: Zone[] = [];
            for (const zn of zoneNames) {
                const zoneDetails = await client.getZoneDetails(zn.key);
                zones.push(zoneDetails);
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return zones;
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to load zone details.";
            return rejectWithValue(message);
        }
    }
);

export const addZone = createAsyncThunk<
    void,
    { name: string; start: number; end: number },
    { rejectValue: string }
>("ble/addZone", async ({ name, start, end }, { dispatch, rejectWithValue }) => {
    try {
        const client = getBleClient();
        await client.addZone(name, start, end);
        // Give the controller time to process
        await new Promise(resolve => setTimeout(resolve, 300));
        dispatch(loadAllZoneDetails());
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to add zone.";
        return rejectWithValue(message);
    }
});

export const editZone = createAsyncThunk<
    void,
    {
        key: string;
        name: string;
        start: number;
        end: number;
        isActive: boolean;
    },
    { rejectValue: string }
>(
    "ble/editZone",
    async ({ key, name, start, end, isActive }, { dispatch, rejectWithValue }) => {
        try {
            const client = getBleClient();
            await client.editZone(key, name, start, end, isActive);
            // Give the controller time to process
            await new Promise(resolve => setTimeout(resolve, 200));
            // Reload zone names to sync with controller
            await dispatch(getZoneNames());
            // Reload details only for this zone
            await dispatch(getZoneDetails(key));
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to edit zone.";
            return rejectWithValue(message);
        }
    }
);

export const setZoneMode = createAsyncThunk<
    void,
    { zoneKey: string; type: string; speed: number; colors: Color[] },
    { rejectValue: string }
>(
    "ble/setZoneMode",
    async ({ zoneKey, type, speed, colors }, { dispatch, getState, rejectWithValue }) => {
        try {
            const client = getBleClient();
            await client.setZoneMode(zoneKey, type, speed, colors);
            // Mode changes need more time to process
            await new Promise(resolve => setTimeout(resolve, 400));
            // Reload details for the selected zone only
            const state = getState() as { ble: BleState };
            if (state.ble.selectedZoneKey === zoneKey) {
                dispatch(getZoneDetails(zoneKey));
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to set zone mode.";
            return rejectWithValue(message);
        }
    }
);

export const clearZoneMode = createAsyncThunk<
    void,
    string,
    { rejectValue: string }
>("ble/clearZoneMode", async (zoneKey, { dispatch, getState, rejectWithValue }) => {
    try {
        const client = getBleClient();
        await client.clearZoneMode(zoneKey);
        // Mode changes need more time to process
        await new Promise(resolve => setTimeout(resolve, 400));
        // Reload details for the selected zone only
        const state = getState() as { ble: BleState };
        if (state.ble.selectedZoneKey === zoneKey) {
            dispatch(getZoneDetails(zoneKey));
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to clear zone mode.";
        return rejectWithValue(message);
    }
});

export const getZoneNames = createAsyncThunk<ZoneNameEntry[], void, { rejectValue: string }>(
    "ble/getZoneNames",
    async (_, { rejectWithValue }) => {
        try {
            const client = getBleClient();
            return await client.getZoneNames();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to fetch zone names.";
            return rejectWithValue(message);
        }
    }
);

export const getZoneDetails = createAsyncThunk<Zone, string, { rejectValue: string }>(
    "ble/getZoneDetails",
    async (key, { rejectWithValue }) => {
        try {
            const client = getBleClient();
            return await client.getZoneDetails(key);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to fetch zone details.";
            return rejectWithValue(message);
        }
    }
);

export const connectBle = createAsyncThunk<
    { isOn: boolean; brightness: number; deviceName: string },
    void,
    { rejectValue: string }
>("ble/connect", async (_, { rejectWithValue, dispatch }) => {
    try {
        const client = getBleClient();
        const result = await client.connect();
        await new Promise(resolve => setTimeout(resolve, 100));
        dispatch(loadAllZoneDetails());
        return result;
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Connection failed.";
        return rejectWithValue(message);
    }
});

export const autoConnectBle = createAsyncThunk<
    { isOn: boolean; brightness: number; deviceName: string },
    void,
    { rejectValue: string }
>("ble/autoConnect", async (_, { rejectWithValue, dispatch }) => {
    try {
        const client = getBleClient();
        const result = await client.autoConnect();
        await new Promise(resolve => setTimeout(resolve, 100));
        dispatch(loadAllZoneDetails());
        return result;
    } catch (error) {
        // Silent fail mostly, or just report error
        const message =
            error instanceof Error ? error.message : "Auto-connection failed.";
        return rejectWithValue(message);
    }
});

export const setPower = createAsyncThunk<
    boolean,
    boolean,
    { rejectValue: string }
>("ble/setPower", async (value, { rejectWithValue }) => {
    try {
        const client = getBleClient();
        await client.setPower(value);
        return value;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Write failed.";
        return rejectWithValue(message);
    }
});

export const setBrightness = createAsyncThunk<
    number,
    number,
    { rejectValue: string }
>("ble/setBrightness", async (value, { rejectWithValue }) => {
    try {
        const client = getBleClient();
        await client.setBrightness(value);
        return value;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Write failed.";
        return rejectWithValue(message);
    }
});

const bleSlice = createSlice({
    name: "ble",
    initialState,
    reducers: {
        setSupportsBle(state, action: PayloadAction<boolean>) {
            state.supportsBle = action.payload;
        },
        setBrightnessLocal(state, action: PayloadAction<number>) {
            state.brightness = action.payload;
        },
        clearError(state) {
            state.error = null;
        },
        setError(state, action: PayloadAction<string>) {
            state.error = action.payload;
        },
        setSelectedZone(state, action: PayloadAction<string | null>) {
            state.selectedZoneKey = action.payload;
            state.selectedZoneDetails = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(connectBle.pending, (state) => {
                state.isConnecting = true;
                state.error = null;
            })
            .addCase(connectBle.fulfilled, (state, action) => {
                state.isConnecting = false;
                state.isConnected = true;
                state.isOn = action.payload.isOn;
                state.brightness = action.payload.brightness;
                pushLog(state, `Connected to ${action.payload.deviceName}`);
            })
            .addCase(connectBle.rejected, (state, action) => {
                state.isConnecting = false;
                state.isConnected = false;
                state.error = action.payload ?? "Connection failed.";
                pushLog(state, state.error);
            })
            .addCase(autoConnectBle.fulfilled, (state, action) => {
                state.isConnected = true;
                state.isOn = action.payload.isOn;
                state.brightness = action.payload.brightness;
                pushLog(state, `Restored connection to ${action.payload.deviceName}`);
            })
            .addCase(setPower.fulfilled, (state, action) => {
                state.isOn = action.payload;
                pushLog(state, action.payload ? "Power on" : "Power off");
            })
            .addCase(setPower.rejected, (state, action) => {
                state.error = action.payload ?? "Write failed.";
                pushLog(state, state.error);
            })
            .addCase(setBrightness.fulfilled, (state, action) => {
                state.brightness = action.payload;
                pushLog(state, `Brightness ${action.payload}`);
            })
            .addCase(setBrightness.rejected, (state, action) => {
                state.error = action.payload ?? "Write failed.";
                pushLog(state, state.error);
            })
            .addCase(editZone.pending, (state, action) => {
                // Save current state for rollback
                state.rollbackZones = JSON.parse(JSON.stringify(state.zones));
                state.rollbackZoneNames = JSON.parse(JSON.stringify(state.zoneNames));
                
                // Optimistic update
                const { key, name, start, end, isActive } = action.meta.arg;
                
                // Update zones
                const zoneIndex = state.zones.findIndex(z => z.key === key);
                if (zoneIndex >= 0) {
                    state.zones[zoneIndex].name = name;
                    state.zones[zoneIndex].start = start;
                    state.zones[zoneIndex].end = end;
                    state.zones[zoneIndex].isActive = isActive;
                }
                
                // Update zoneNames
                const nameIndex = state.zoneNames.findIndex(z => z.key === key);
                if (nameIndex >= 0) {
                    state.zoneNames[nameIndex].name = name;
                    state.zoneNames[nameIndex].isActive = isActive;
                }
            })
            .addCase(editZone.fulfilled, (state) => {
                // Clear rollback data on success
                state.rollbackZones = null;
                state.rollbackZoneNames = null;
            })
            .addCase(editZone.rejected, (state, action) => {
                // Rollback on error
                if (state.rollbackZones) {
                    state.zones = state.rollbackZones;
                    state.rollbackZones = null;
                }
                if (state.rollbackZoneNames) {
                    state.zoneNames = state.rollbackZoneNames;
                    state.rollbackZoneNames = null;
                }
                state.error = action.payload ?? "Failed to edit zone.";
                pushLog(state, "Error: " + state.error);
            })
            .addCase(getZones.fulfilled, (state, action) => {
                state.zones = action.payload;
                pushLog(state, `Loaded ${action.payload.length} zones.`);
            })
            .addCase(getZones.rejected, (state, action) => {
                pushLog(state, "Failed to load zones: " + action.payload);
            })
            .addCase(loadAllZoneDetails.pending, (state) => {
                state.isLoadingZones = true;
            })
            .addCase(loadAllZoneDetails.fulfilled, (state, action) => {
                state.zones = action.payload;
                state.zoneNames = action.payload.map(z => ({
                    name: z.name,
                    key: z.key,
                    isActive: z.isActive,
                }));
                state.isLoadingZones = false;
                pushLog(state, `Loaded details for ${action.payload.length} zones.`);
            })
            .addCase(loadAllZoneDetails.rejected, (state, action) => {
                state.isLoadingZones = false;
                pushLog(state, "Failed to load zone details: " + action.payload);
            })
            .addCase(getZoneNames.fulfilled, (state, action) => {
                state.zoneNames = action.payload;
            })
            .addCase(getZoneNames.rejected, (state, action) => {
                pushLog(state, "Failed to load zone names: " + action.payload);
            })
            .addCase(getZoneDetails.fulfilled, (state, action) => {
                // Update or add zone in zones array
                const index = state.zones.findIndex(z => z.key === action.payload.key);
                if (index >= 0) {
                    state.zones[index] = action.payload;
                } else {
                    state.zones.push(action.payload);
                }
                
                // Update selectedZoneDetails if this is the selected zone
                if (state.selectedZoneKey === action.payload.key) {
                    state.selectedZoneDetails = action.payload;
                }
                
                pushLog(state, `Loaded details for ${action.payload.name}`);
            })
            .addCase(getZoneDetails.rejected, (state, action) => {
                pushLog(state, "Failed to load zone details: " + action.payload);
            })
            .addCase(setZoneMode.rejected, (state, action) => {
                state.error = action.payload ?? "Failed to set zone mode.";
                pushLog(state, "Error: " + state.error);
            })
            .addCase(clearZoneMode.rejected, (state, action) => {
                state.error = action.payload ?? "Failed to clear zone mode.";
                pushLog(state, "Error: " + state.error);
            });
    },
});

export const { setSupportsBle, setBrightnessLocal, clearError, setError, setSelectedZone } =
    bleSlice.actions;

export default bleSlice.reducer;
