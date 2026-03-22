declare module 'hb-rpi-tools/GpioClient/Rgpio' {
  class Rgpio {
    constructor({ hostname: string, user: string, password: string, timeout: number });
    connect(): Promise<void>;
    setPwm(gpio: number): void;
    writePwm(gpio: number, dutyCycle: number): void;
  }
}
