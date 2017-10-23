const config = {};

// web3 parameter
config.host = 'http://121.42.8.74'; // http://localhost
//config.host = 'http://192.168.1.77'; // http://localhost
config.port = 8545;

// Instance Address
config.contractInstanceAddress = '0x0000000000000000000000000000000000000006';

// Monitor.js parameter
config.ota = '02132f32a101f76a5671bb11e2cb101f8834babf160647b99d56dbbf64e1bc4d9d02220bf5bd3aa0f778f188aa2808df02334de887472239192817cac677f2f223c8';
config.refundValue = 200000000000000000;

// preCompiledTest.js parameter
config.from_sk = 'a4369e77024c2ade4994a9345af5c47598c7cfb36c65e8a4a3117519883d9014';
config.from_address = '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e';
config.to_waddress = '0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9';
config.transferValue = 1000000000000000000;


// console color
config.consoleColor = {
	'COLOR_FgRed': '\x1b[31m',
	'COLOR_FgYellow': '\x1b[33m',
	'COLOR_FgGreen': "\x1b[32m"
};

// config.stampType = {
// 	TypeOne:0,
// 	TypeTwo:1,
// 	TypeFour:2,
// 	TypeEight:3,
// 	TypeSixteen:4
// };

module.exports = config;
