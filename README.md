# rpi-hdmi-touchscreen-driver
Enable Waveshare Electronics [5inch HDMI LCD Rev1.1](https://www.waveshare.com/wiki/5inch_HDMI_LCD_(B)) touch feature for Raspbian Stretch.

## Prerequisites

### Access rights

During calibration, uinput events are generated. Users with no administrative rights will need to temporarily give access to uinput.
If not already present, change the rights of the following files :

##### Linux
>```bash
>sudo chmod 666 /dev/uinput
>```

After reboot the rights will be reseted.

### Calibration

Install [tslib](https://github.com/kergoth/tslib) to calibrate the touchscreen. Follow the tutorial from the [rpi-5inch-hdmi-touchscreen-driver](https://github.com/saper-2/rpi-5inch-hdmi-touchscreen-driver#3-install-tslib) github repository to install the latest version.

## Test & Install

##### Linux
>```bash
>node index.js
>```

## Credits
* [node-hid](https://github.com/node-hid/node-hid) to read hidraw devices.
* [robotjs](https://github.com/octalmage/robotjs) to emulate the mouse movements and the mouse clicks. 
* [rpi-5inch-hdmi-touchscreen-driver](https://github.com/saper-2/rpi-5inch-hdmi-touchscreen-driver) for the excellent documentation about the interface of this type of touchscreen.
* [tslib](https://github.com/kergoth/tslib) to calibrate the touchscreen.
* [uinput](https://github.com/santigimeno/node-uinput) to calibrate the touchscreen.
