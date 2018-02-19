const util = require('util');
const uinput = require('uinput');
const calibration = false;
const robot = require("robotjs");
const HID = require('node-hid');
let evenementClic;

const tsLibConfigFile = [15658, 47, -4994720, 276, 8254, -2224856, 65536, 800, 480];

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

        if (deviceInfo) {
            device = new HID.HID(deviceInfo.path);
            device.on("data", function (data) {
                let coordinates;
                if (!tsLibConfigFile) {
                    coordinates = getNonAdjustedCoordinates(data);
                } else {
                    coordinates = getAdjustedCoordinates(tsLibConfigFile, data);
                }
                if (!coordinates) {
                    return;
                }

                console.debug('adjusted coordinates', coordinates, coordinates.y);
                if (!calibration) {
                    robot.moveMouse(coordinates.x, coordinates.y);
                }
            })
        }

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

        }
        else {
            var screenSize = robot.getScreenSize();
            console.info('Screensize : ', screenSize);
            robot.setMouseDelay(2);
        }
    }
    catch (e) {
        console.error(e, e.stack);
        throw e;
    }
};

startListening();


// let tsLibConfigFile = [15734, 33, -6863416, 22, 8131, -1233652, 65536, 800, 480];

function getNonAdjustedCoordinates(data) {
    const mouseClick = detectMouseClick(data);

    if (mouseClick) {
        return;
    }

    return {
        x: parseInt(data[2].toString(16).padStart(2, '0') + data[3].toString(16).padStart(2, '0'), 16),
        y: parseInt(data[4].toString(16).padStart(2, '0') + data[5].toString(16).padStart(2, '0'), 16)
    };
}

function getAdjustedCoordinates(calibrationData, data) {

    const coordinates = getNonAdjustedCoordinates(data);
    console.debug('Non adjusted coordinates', coordinates);

    if (undefined === coordinates) {
        return;
    }
    return {
        x: (tsLibConfigFile[2] + tsLibConfigFile[0] * coordinates.x + tsLibConfigFile[1] * coordinates.y) / tsLibConfigFile[6],
        y: (tsLibConfigFile[5] + tsLibConfigFile[3] * coordinates.x + tsLibConfigFile[4] * coordinates.y) / tsLibConfigFile[6]
    }
}

function detectMouseClick(data) {
    let keyPressed = false;
    if (0xAA === data[0] && 0x00 === data[1]) {
        keyPressed = true;
        if (evenementClic) {
            clearTimeout(evenementClic);
        }
        evenementClic = setTimeout(() => {
            console.debug('mouse clic');

            /*uinput.key_event(stream, uinput.BTN_LEFT, function (err) {
                if (err) {
                    throw (err);
                }
            });*/

            robot.mouseClick();
        }, 100);
    } else if (evenementClic) {
        clearTimeout(evenementClic);
    }

    return keyPressed;
}
