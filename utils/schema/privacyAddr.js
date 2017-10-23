var colors = require("colors/safe");

var privacyAddrSchema = {
	properties: {
		waddress: {
			pattern: '0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9',
			message: "this test only use 0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9",
			description: colors.magenta("input receiver waddress"),
			required: true
		}
	}
};

module.exports = privacyAddrSchema;
