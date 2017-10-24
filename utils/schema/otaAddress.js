var colors = require("colors/safe");

var otaAddressSchema = {
	properties: {
		address: {
			pattern: /^[0-9a-fA-F]{132}$/,
			message: 'ota address invalid!',
			description: colors.magenta("input ota address"),
			required: true
		}
	}
};

module.exports = otaAddressSchema;