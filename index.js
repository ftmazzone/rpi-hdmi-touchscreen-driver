var uinput = require('uinput');

var setup_options = { EV_ABS: [uinput.ABS_X, uinput.ABS_Y], EV_KEY: [uinput.BTN_LEFT, uinput.BTN_RIGHT] }

uinput.setup(setup_options, function (err, stream) {
    console.log(stream);
    if (err) {
        throw (err);
    }

    var create_options = {
        name: 'myuinput',
        id: {
            bustype: uinput.BUS_VIRTUAL,
            vendor: 0x1,
            product: 0x1,
            version: 1
        }
    };

    uinput.create(stream, create_options, function (err) {
        if (err) {
            throw (err);
        }


        // Move the mouse across the screen as a sine wave.
        var robot = require("robotjs");
        var HID = require('node-hid');
        var devices = HID.devices();

        // Speed up the mouse.
        robot.setMouseDelay(2);

        var twoPI = Math.PI * 2.0;
        var screenSize = robot.getScreenSize();
        console.log(screenSize);
        var device;

        //let tsLibConfigFile = [15658, 47, -4994720, 276, 8254, -2224856, 65536, 800, 480];
        let tsLibConfigFile = [15734, 33, -6863416, 22, 8131, -1233652, 65536, 800, 480];
        let evenementClic;

        function determinerCoordonneesNonCorrigees(data) {
            if (0xAA === data[0] && 0x00 === data[1]) {
                if (evenementClic) {
                    clearTimeout(evenementClic);
                }
                evenementClic = setTimeout(() => {
                    //console.log('clic');

                    uinput.key_event(stream, uinput.BTN_LEFT, function (err) {
                        if (err) {
                            throw (err);
                        }
                    });

                    robot.mouseClick();
                }, 100)
                return;
            }


            if (evenementClic) {
                clearTimeout(evenementClic);
            }

            let x = parseInt(data[2].toString(16).padStart(2, '0') + data[3].toString(16).padStart(2, '0'), 16);
            let y = parseInt(data[4].toString(16).padStart(2, '0') + data[5].toString(16).padStart(2, '0'), 16);

            uinput.send_event(stream, uinput.EV_ABS, uinput.ABS_X, x, function (err) {
                if (err) {
                    throw (err);
                }
            });

            uinput.send_event(stream, uinput.EV_ABS, uinput.ABS_Y, y, function (err) {
                if (err) {
                    throw (err);
                }
            });

            return { x, y };
        }

        const deviceInfo = devices.find(function (d) {
            console.log(d.vendorId, d.productId);
            var isTeensy = d.vendorId === 0xEEF && d.productId === 0x5;
            console.log(isTeensy);
            return isTeensy;
        });

        if (deviceInfo) {
            device = new HID.HID(deviceInfo.path);
            device.on("data", function (data) {
                let coordonnees = determinerCoordonneesNonCorrigees(data);
                if (!coordonnees) {
                    console.log('non posé');
                    return;
                }

                let dx = (tsLibConfigFile[2] + tsLibConfigFile[0] * coordonnees.x + tsLibConfigFile[1] * coordonnees.y) / tsLibConfigFile[6];
                let dy = (tsLibConfigFile[5] + tsLibConfigFile[3] * coordonnees.x + tsLibConfigFile[4] * coordonnees.y) / tsLibConfigFile[6];
                //console.log(coordonnees.x, coordonnees.y, new Date());
                robot.moveMouse(dx, dy);
            })
        }
    });
});