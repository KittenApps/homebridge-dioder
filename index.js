"use strict";

const Gpio = require('pigpio').Gpio;
const colord = require("colord").colord;

module.exports = (api) => {
  api.registerAccessory('Dioder', DioderAccessoryPlugin);
}

class DioderAccessoryPlugin {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.rPin = new Gpio(config['rPin'], {mode: Gpio.OUTPUT});
    this.gPin = new Gpio(config['gPin'], {mode: Gpio.OUTPUT});
    this.bPin = new Gpio(config['bPin'], {mode: Gpio.OUTPUT});
    this.rPin.pwmWrite(0);
    this.gPin.pwmWrite(0);
    this.bPin.pwmWrite(0);

    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Silizia")
      .setCharacteristic(this.api.hap.Characteristic.Model, "Fancy LED");

    this.LEDservice = new this.Service.Lightbulb(this.name);
    this.LEDservice.getCharacteristic(this.Characteristic.On)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness)
      .onGet(this.getBrightness.bind(this))
      .onSet(this.setBrightness.bind(this));  
  }

  getServices() {
    return [this.informationService, this.LEDservice];
  }

  async getOn() {
    return this.rPin.getPwmDutyCycle() > 0;
  }
  
  async setOn(value) {
    const v = Math.floor(this.LEDservice.getCharacteristic(this.Characteristic.Brightness).value * 2.55);
    this.log(v);
    this.rPin.pwmWrite(value ? (v || 255) : 0);
  }

  async setBrightness(value) {
    this.rPin.pwmWrite(Math.floor(value * 2.55));
  }

  async getBrightness() {
    return Math.floor(this.rPin.getPwmDutyCycle() / 2.55);
  }
}

/*toggleState() {
    this.log("toggleState");
    const on = this.LEDservice.getCharacteristic(this.Characteristic.On).value(); 
    this.log(on);
    if(!on){
      this.log(21);
      this.updateRGB({ r: 0, g: 0, b: 0 });
      this.log("turned off", this.LEDservice.getCharacteristic(this.Characteristic.On).value());
      return;
    }
    this.log(42);
    this.log(this.LEDservice.getCharacteristic(this.Characteristic.Brightness));
    const v = this.LEDservice.getCharacteristic(this.Characteristic.Brightness).value;
    this.log("v:", v);
    if(v != 0){
      const h = this.LEDservice.getCharacteristic(this.Characteristic.Hue).value;
      const s = this.LEDservice.getCharacteristic(this.Characteristic.Saturation).value;
      this.updateRGB(colord({ h, s, v }).toRgb());
      this.log(h,s,v);
    } else{
      this.updateRGB({ r: 0, g: 0, b: 0 });
    }
  }

  updateRGB(c){
    this.log(`Setting rgb values to: Red: ${c.r} Green: ${c.g} Blue: ${c.b}`);
    this.rPin.pwmWrite(c.r);
    this.gPin.pwmWrite(c.g);
    this.bPin.pwmWrite(c.b);
  }
}*/