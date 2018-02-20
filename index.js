const util = require('util');
const uinput = require('uinput');
const robot = require("robotjs");
const HID = require('node-hid');
let evenementClic;
const calibration = false;

//Use tslib to get calibration data : TSLIB_CONFFILE=/etc/ts.conf TSLIB_CALIBFILE=/etc/pointercal TSLIB_FBDEVICE=/dev/fb0 TSLIB_TSDEVICE=/dev/input/event0 ts_calibrate
//sudo chmod 666 /dev/uinput
const tsLibConfigFile = [15658, 47, -4994720, 276, 8254, -2224856, 65536, 800, 480];
let mouseMoveCallback, mouseButtonClickCallback;

const startListening = async () => {
    try {

        //Scan for hid devices
        const devices = HID.devices();
        console.info(`Number of HID devices available : ${devices.length}`);

        let device;
        const deviceInfo = devices.find(function (d) {
            console.info(`Hid device found - vendorId : ${d.vendorId} productId : ${d.productId}`)

            let isTeensy = false;
            if (isTeensy = (d.vendorId === 0xEEF && d.productId === 0x5)) {
                console.info(`Waveshare touchscreen found`);
            }
            return isTeensy;
        });

        //Initialize the touchscreen uinput events needed for the calibration with tslib (https://github.com/kergoth/tslib)
        if (calibration) {
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

            mouseMoveCallback = (coordinates) => {
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
            };

            mouseButtonClickCallback = () => {
                uinput.key_event(stream, uinput.BTN_LEFT, function (err) {
                    if (err) {
                        throw (err);
                    }
                });
            };

        }
        else {
            var screenSize = robot.getScreenSize();
            console.info('Screensize : ', screenSize);
            robot.setMouseDelay(2);

            mouseMoveCallback = (coordinates) => {
                if (undefined === coordinates) {
                    return;
                }

                coordinates = {
                    x: (tsLibConfigFile[2] + tsLibConfigFile[0] * coordinates.x + tsLibConfigFile[1] * coordinates.y) / tsLibConfigFile[6],
                    y: (tsLibConfigFile[5] + tsLibConfigFile[3] * coordinates.x + tsLibConfigFile[4] * coordinates.y) / tsLibConfigFile[6]
                };

                robot.moveMouse(coordinates.x, coordinates.y);
            }

            mouseButtonClickCallback = () => {
                robot.mouseClick();
            };
        }

        //Configure hid device listener
        if (deviceInfo) {
            device = new HID.HID(deviceInfo.path);
            device.on("data", function (data) {
                getCoordinates(data, mouseMoveCallback, mouseButtonClickCallback);
            })
        }
    }
    catch (e) {
        console.error(e, e.stack);
        throw e;
    }
};

startListening();

function getCoordinates(data, mouseMoveCallback,mouseButtonClickCallback) {

    const mouseClick = detectMouseClick(data, mouseButtonClickCallback);

    if (mouseClick) {
        return;
    }

    const coordinates = {
        x: parseInt(data[2].toString(16).padStart(2, '0') + data[3].toString(16).padStart(2, '0'), 16),
        y: parseInt(data[4].toString(16).padStart(2, '0') + data[5].toString(16).padStart(2, '0'), 16)
    };
    mouseMoveCallback(coordinates)

    return coordinates;
}

function detectMouseClick(data,mouseButtonClickCallback) {
    let keyPressed = false;
    if (0xAA === data[0] && 0x00 === data[1]) {
        keyPressed = true;
        if (evenementClic) {
            clearTimeout(evenementClic);
        }
        evenementClic = setTimeout(() => {
            mouseButtonClickCallback();
        }, 100);
    } else if (evenementClic) {
        clearTimeout(evenementClic);
    }

    return keyPressed;
}
