import { Injectable, OnDestroy } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';

export type Devices = MediaDeviceInfo[];

@Injectable()
export class DeviceService implements OnDestroy {
    $devicesUpdated: Observable<Promise<Devices>>;

    private deviceBroadcast = new ReplaySubject<Promise<Devices>>();

    constructor() {
        if (navigator && navigator.mediaDevices) {
            navigator.mediaDevices.ondevicechange = (_: Event) => {
                this.deviceBroadcast.next(this.getDeviceOptions());
            }
        }

        this.$devicesUpdated = this.deviceBroadcast.asObservable();
        this.deviceBroadcast.next(this.getDeviceOptions());
    }

    ngOnDestroy(): void {
        if (this.deviceBroadcast) {
            this.deviceBroadcast.unsubscribe();
        }
    }

    private async isGrantedMediaPermissions() {
        if (navigator && navigator.userAgent && navigator.userAgent.indexOf('Chrome') < 0) {
            return true; // Follows standard workflow for non-Chrome browsers.
        }

        if (navigator && navigator['permissions']) {
            try {
                const permissionName = "camera" as PermissionName;
                const result = await navigator['permissions'].query({ name: permissionName });
                if (result) {
                    if (result.state === 'granted') {
                        return true;
                    } else {
                        const isGranted = await new Promise<boolean>(resolve => {
                            result.onchange = (_: Event) => {
                                const granted = (_ as any).target['state'] === 'granted';
                                if (granted) {
                                    resolve(true);
                                }
                            }
                        });

                        return isGranted;
                    }
                }
            } catch (e) {
                // This is only currently supported in Chrome.
                // https://stackoverflow.com/a/53155894/2410379
                return true;
            }
        }

        return false;
    }

    private async getDeviceOptions(): Promise<Devices> {
        const isGranted = await this.isGrantedMediaPermissions();
        if (navigator && navigator.mediaDevices && isGranted) {
            let devices = await this.tryGetDevices();
            if (devices.every(d => !d.label)) {
                devices = await this.tryGetDevices();
            }
            return devices.filter(d => !!d.label);
        }

        return null;
    }

    private async tryGetDevices() {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const devices = ['audioinput', 'audiooutput', 'videoinput'].reduce((options, kind) => {
            return options[parseInt(kind)] = mediaDevices.filter(device => device.kind === kind) as any;
        }, [] as Devices);

        return devices;
    }
}