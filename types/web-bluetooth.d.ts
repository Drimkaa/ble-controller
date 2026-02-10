export { };

declare global {
    interface Navigator {
        bluetooth?: Bluetooth;
    }

    interface Bluetooth {
        requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
        getDevices(): Promise<BluetoothDevice[]>;
    }

    interface RequestDeviceOptions {
        filters?: BluetoothLEScanFilter[];
        optionalServices?: BluetoothServiceUUID[];
        acceptAllDevices?: boolean;
    }

    type BluetoothServiceUUID = number | string;

    interface BluetoothLEScanFilter {
        services?: BluetoothServiceUUID[];
        name?: string;
        namePrefix?: string;
    }

    interface BluetoothDevice extends EventTarget {
        id: string;
        name?: string;
        gatt?: BluetoothRemoteGATTServer;
        addEventListener(
            type: "gattserverdisconnected",
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
        ): void;
    }

    interface BluetoothRemoteGATTServer {
        connected: boolean;
        connect(): Promise<BluetoothRemoteGATTServer>;
        getPrimaryService(
            service: BluetoothServiceUUID
        ): Promise<BluetoothRemoteGATTService>;
    }

    interface BluetoothRemoteGATTService {
        getCharacteristic(
            characteristic: BluetoothCharacteristicUUID
        ): Promise<BluetoothRemoteGATTCharacteristic>;
    }

    type BluetoothCharacteristicUUID = number | string;

    interface BluetoothRemoteGATTCharacteristic {
        readValue(): Promise<DataView>;
        writeValue(value: BufferSource): Promise<void>;
    }
}
