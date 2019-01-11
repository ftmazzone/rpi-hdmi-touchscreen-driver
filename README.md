# rpi-hdmi-touchscreen-driver
Enable Waveshare Electronics [5inch HDMI LCD Rev1.1](https://www.waveshare.com/wiki/5inch_HDMI_LCD_(B)) touch feature for Raspbian Stretch.

## Prerequisites

### Access rights

During calibration, uinput events are generated. Users with no administrative rights will need to temporarily give access to uinput.
If not already present, configure the rights to access the hid devices.

##### Linux
In the file '/etc/udev/rules.d/99-com.rules', append 'KERNEL=="hidraw*", ATTRS{idVendor}=="0eef", ATTRS{idProduct}=="0005", MODE="0660", GROUP="plugdev"'
>```bash
>echo "KERNEL==\"hidraw*\", ATTRS{idVendor}==\"0eef\", ATTRS{idProduct}==\"0005\", MODE=\"0660\", GROUP=\"plugdev\"" >> /etc/udev/rules.d/99-com.rules
>```

Only for calibration
>```bash
>sudo chmod 666 /dev/uinput
>```

After reboot the rights will be reseted.

### Calibration

Install [tslib](https://github.com/kergoth/tslib) to calibrate the touchscreen. Follow the tutorial from the [rpi-5inch-hdmi-touchscreen-driver](https://github.com/saper-2/rpi-5inch-hdmi-touchscreen-driver#3-install-tslib) github repository to install the latest version.

## Test

##### Linux
>```bash
>npm start
>```

## Installation

##### Linux
* Run the touchscreendriver after X starts by adding a startup script in **_/etc/X11/Xsession.d_**

>```bash
>echo $'#!/bin/sh\nnode /home/pi/rpi-hdmi-touchscreen-driver/index.js &\n' > /etc/X11/Xsession.d/99wav-touchscreen_driver
>chmod 755 /etc/X11/Xsession.d/99wav-touchscreen_driver
>```

## Credits
* [node-hid](https://github.com/node-hid/node-hid) to read hidraw devices. - [MIT](https://opensource.org/licenses/MIT)
* [robotjs](https://github.com/octalmage/robotjs) to emulate the mouse movements and the mouse clicks. - [MIT](https://github.com/octalmage/robotjs/blob/master/LICENSE.md)
* [rpi-5inch-hdmi-touchscreen-driver](https://github.com/saper-2/rpi-5inch-hdmi-touchscreen-driver) for the excellent documentation about the interface of this type of touchscreen. - [MIT](https://github.com/saper-2/rpi-5inch-hdmi-touchscreen-driver/blob/master/LICENSE)
* [tslib](https://github.com/kergoth/tslib) to calibrate the touchscreen. - [GNU Lesser General Public License v2.1](https://github.com/kergoth/tslib/blob/master/COPYING)
* [uinput](https://github.com/santigimeno/node-uinput) to calibrate the touchscreen. - [ISC](https://opensource.org/licenses/ISC)
