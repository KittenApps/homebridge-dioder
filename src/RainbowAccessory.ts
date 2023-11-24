import type { PlatformAccessory, CharacteristicValue, Service, Logging, HAP } from 'homebridge';
import type { DioderAccessory } from './DioderAccessory';

const INTERVAL = 1000 / 30; // 30 FPS
const SPEED = 100; // 1..100 => 0.01..1
const OFFSET_CT = 5; // 140..500  => 28..100
const SATURATION = 100;

export class RainbowAccessory {
  private brightness: number;
  private currentHue: number;
  private offset: number;
  private speed:number;
  private on: boolean;
  private onS: boolean;
  private interval: NodeJS.Timeout | undefined;

  private readonly LEDservice: Service;
  private readonly FanService: Service;
  private readonly Characteristic;

  constructor(private readonly log: Logging, hap: HAP, private readonly accessory: PlatformAccessory, private readonly leds: DioderAccessory[]) {
    this.Characteristic = hap.Characteristic;

    this.on = false;
    this.onS = false;
    this.brightness = 0;
    this.offset = 50;
    this.speed = 0.5;
    this.currentHue = 0;
    this.interval = undefined;

    this.accessory.getService(hap.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Silizia')
      .setCharacteristic(this.Characteristic.Model, 'Fancy LED')
      .setCharacteristic(this.Characteristic.SerialNumber, '42');
    
    this.accessory.on('identify', () => this.identify());

    this.LEDservice = this.accessory.getService(hap.Service.Lightbulb) || this.accessory.addService(hap.Service.Lightbulb);
    this.LEDservice.setCharacteristic(this.Characteristic.Name, "Rainbow Effect");
    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.ColorTemperature).onGet(this.getColorTemperature.bind(this)).onSet(this.setColorTemperature.bind(this));

    this.FanService = this.accessory.getService(hap.Service.Fan) || this.accessory.addService(hap.Service.Fan);
    this.FanService.setCharacteristic(this.Characteristic.Name, "Rainbow Effect Speed");
    this.FanService.getCharacteristic(this.Characteristic.On).onGet(this.getOnS.bind(this)).onSet(this.setOnS.bind(this));
    this.FanService.getCharacteristic(this.Characteristic.RotationSpeed).onGet(this.getSpeed.bind(this)).onSet(this.setSpeed.bind(this));
  }

  identify(): void {
    this.log.info("Identify!");
  }
  
  setOn(on: CharacteristicValue): void {
    this.log.info("rainbow setOn", on);
    this.on = on as boolean;
    if (on){
      if (this.getBrightness() === 0){
        this.brightness = 100;
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      }
    } else {
      this.FanService.setCharacteristic(this.Characteristic.On, false);
      // restore previous LED state
    }
  }

  getOn(): boolean {
    return this.on;
  }

  setOnS(on: CharacteristicValue): void {
    this.log.info("rainbow setOnS", on);
    this.onS = on as boolean;
    if (on){
      this.interval = setInterval(() => this.runAnimation(), INTERVAL);
    } else {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  getOnS(): boolean {
    return this.onS; // interval running
  }

  setBrightness(v: CharacteristicValue): void {
    this.log.info("rainbow setBrightness", v);
    this.brightness = v as number;
  }

  getBrightness(): number {
    return this.brightness;
  }

  setColorTemperature(v: CharacteristicValue): void {
    this.log.info("rainbow setColorTemperature", v);
    this.offset = (v as number) / OFFSET_CT;
  }

  getColorTemperature(): number {
    return this.offset * OFFSET_CT;
  }

  setSpeed(v: CharacteristicValue): void {
    this.log.info("rainbow speed", v);
    this.speed = (v as number) / SPEED;
  }

  getSpeed(): number {
    return this.speed * SPEED;
  }

  runAnimation(): void {
    this.log.warn(`currentHue: ${this.currentHue}, offset: ${this.offset}, speed: ${this.speed}`);
    for (let i = 0; i < this.leds.length; i++){
      this.leds[i].setHSV({
        h: (this.currentHue + i * this.offset) % 360,
        s: SATURATION,
        v: this.brightness
      }, true);
    }
    this.currentHue = (this.currentHue + this.speed) % 360;
  }
}
