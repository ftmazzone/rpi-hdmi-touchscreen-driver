const util = require('util');
const uinput = require('uinput');
const robot = require("robotjs");
const HID = require('node-hid');
const fs = require('fs')
let keyPressed = 0, rightKeyPressed = 0, lastCoordinates, keyPressedDown = new Date();
let keyUpEvent;
let calibrationMode = true;
let device;

//Use tslib to get calibration data : TSLIB_CONFFILE=/etc/ts.conf TSLIB_CALIBFILE=/etc/pointercal TSLIB_FBDEVICE=/dev/fb0 TSLIB_TSDEVICE=/dev/input/event0 ts_calibrate
//sudo chmod 666 /dev/uinput

let tsLibConfig = [15658, 47, -4994720, 276, 8254, -2224856, 65536, 800, 480];
let handleTouchScreenEvent;

async function initialize() {

    //Scan for hid devices
    const devices = HID.devices();
    console.info(`Number of HID devices available : ${devices.length}`);

    const deviceInfo = devices.find(function (d) {
        console.info(`Hid device found - vendorId : ${d.vendorId} productId : ${d.productId}`)

        let isWvTouchscreen;
        if (isWvTouchscreen = (d.vendorId === 0x0EEF && d.productId === 0x0005)) {
            console.info(`Waveshare touchscreen found`);
        }
        return isWvTouchscreen;
    });

    //Check if tslib configuration file is available
    const pathTsConfiguration = '/etc/pointercal';
    if (fs.existsSync(pathTsConfiguration)) {
        const fsReadFilePromise = util.promisify(fs.readFile);
        const tsConfiguration = await fsReadFilePromise(pathTsConfiguration, 'utf8');
        tsLibConfig = tsConfiguration.split(' ').map((d) => +d);
        calibrationMode = false;
        console.info(`Reading tslib calibration data in \'${pathTsConfiguration}\'. Calibration data : \'${JSON.stringify(tsLibConfig)}\'`);
    }
    else {
        console.info(`\nCalibration mode activated. Run TsLib to get calibration data.
Example of command to run: TSLIB_CONFFILE=/etc/ts.conf TSLIB_CALIBFILE=/etc/pointercal TSLIB_FBDEVICE=/dev/fb0 TSLIB_TSDEVICE=/dev/input/event0 ts_calibrate
Ensure that the current user has the required access rights to \'/dev/uinput\'.\n`)
    }

    if (calibrationMode) {
        //Initialize the touchscreen uinput events needed for the calibration with tslib (https://github.com/kergoth/tslib)
        const uinputSetupPromise = util.promisify(uinput.setup);
        const uiInputCreatePromise = util.promisify(uinput.create);
        const setupOptions = { EV_ABS: [uinput.ABS_X, uinput.ABS_Y], EV_KEY: [uinput.BTN_LEFT, uinput.BTN_RIGHT] };
        const createOptions = {
            name: 'virtualtouchscreen',
            id: {
                bustype: uinput.BUS_VIRTUAL,
                vendor: 0x1,
                product: 0x1,
                version: 1
            }
        };

        const stream = await uinputSetupPromise(setupOptions);
        await uiInputCreatePromise(stream, createOptions);

        handleTouchScreenEvent = (data) => {

            if (!keyUpEvent) {
                clearTimeout(keyUpEvent);
            }

            if (0xAA === data[0] && 0x01 === data[1]) {
                const coordinates = {
                    x: parseInt(data[2].toString(16).padStart(2, '0') + data[3].toString(16).padStart(2, '0'), 16),
                    y: parseInt(data[4].toString(16).padStart(2, '0') + data[5].toString(16).padStart(2, '0'), 16)
                };

                uinput.send_event(stream, uinput.EV_ABS, uinput.ABS_X, coordinates.x, function (err) {
                    if (err) {
                        throw (err);
                    }
                });

                uinput.send_event(stream, uinput.EV_ABS, uinput.ABS_Y, coordinates.y, function (err) {
                    if (err) {
                        throw (err);
                    }
                });

                keyPressed = 1;
            }
            else if (0xAA === data[0] && 0x00 === data[1] && 1 === keyPressed) {
                keyUpEvent = setTimeout(() => {
                    uinput.key_event(stream, uinput.BTN_LEFT, function (err) {
                        if (err) {
                            throw (err);
                        }
                    });
                    keyPressed = 0;
                    keyUpEvent = undefined;
                }, 1000);
            }
        }
    }
    else {
        //Initialize the callbacks to move the mouse pointer using RobotJs
        var screenSize = robot.getScreenSize();
        console.info('Screensize : ', screenSize);
        robot.setMouseDelay(2);

        handleTouchScreenEvent = (data) => {
            if (0xAA === data[0] && 0x01 === data[1]) {
                let coordinates = {
                    x: parseInt(data[2].toString(16).padStart(2, '0') + data[3].toString(16).padStart(2, '0'), 16),
                    y: parseInt(data[4].toString(16).padStart(2, '0') + data[5].toString(16).padStart(2, '0'), 16)
                };
                coordinates = {
                    x: (tsLibConfig[2] + tsLibConfig[0] * coordinates.x + tsLibConfig[1] * coordinates.y) / tsLibConfig[6],
                    y: (tsLibConfig[5] + tsLibConfig[3] * coordinates.x + tsLibConfig[4] * coordinates.y) / tsLibConfig[6]
                };

                if (0 === rightKeyPressed) {
                    robot.moveMouse(coordinates.x, coordinates.y);
                }

                if (0 === keyPressed && 0 === rightKeyPressed) {
                    lastCoordinates = coordinates;
                    keyPressedDown = new Date();
                    keyPressed = 1;
                }
                else if (0 === rightKeyPressed && lastCoordinates && (new Date().getTime() - keyPressedDown.getTime()) > 1000
                    && Math.sqrt(Math.pow(coordinates.x - lastCoordinates.x, 2) + Math.pow(coordinates.y - lastCoordinates.y, 2)) < 20) {
                    rightKeyPressed = 1;
                    robot.mouseClick('right');

                    setTimeout(() => {
                        rightKeyPressed = 0;
                        keyPressed = 0;
                    }, 2000);
                }
            }
            else if (keyPressed > 0 && 0 === rightKeyPressed) {
                if (!keyUpEvent) {
                    clearTimeout(keyUpEvent);
                }
                keyUpEvent = setTimeout(() => {

                    if (keyPressed <= 2) {
                        robot.mouseClick();
                    }
                    else {
                        robot.mouseClick('left', true);
                    }
                    keyUpEvent = undefined;
                    keyPressed = 0;
                }, 500);
                keyPressed++;
            }
            return keyPressed;
        }
    }

    return { deviceInfo };
}

const startListening = async () => {
    try {
        const info = await initialize();

        //Configure hid device listener
        if (info.deviceInfo) {
            device = new HID.HID(info.deviceInfo.path);
            device.on("data", function (data) {
                handleTouchScreenEvent(data);
            });
        }
    }
    catch (e) {
        console.error(e, e.stack);
        throw e;
    }
};

startListening();

