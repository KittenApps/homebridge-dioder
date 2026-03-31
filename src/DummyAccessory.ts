import type { PlatformAccessory, Service, Logging } from 'homebridge';

import type DioderPlatform from './DioderPlatform';

export default class DioderAccessory {

  private readonly LEDservice: Service;
  private readonly Characteristic;
  private readonly log: Logging;

  constructor(
    private readonly platform: DioderPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly name: string
  ) {
    const { hap } = platform.api;
    this.Characteristic = hap.Characteristic;
    this.log = platform.log;

    this.accessory
      .getService(hap.Service.AccessoryInformation)
      ?.setCharacteristic(this.Characteristic.Manufacturer, 'Silizia')
      .setCharacteristic(this.Characteristic.Model, 'Fancy LED')
      .setCharacteristic(this.Characteristic.SerialNumber, '42');


    this.LEDservice = this.accessory.getService(hap.Service.Lightbulb) || this.accessory.addService(hap.Service.Lightbulb);
    this.LEDservice.setCharacteristic(this.Characteristic.Name, this.name);
  }
}
