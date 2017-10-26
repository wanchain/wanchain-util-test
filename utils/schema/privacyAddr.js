var colors = require("colors/safe");

var privacyAddrSchema = {
	properties: {
		waddress: {
			pattern: /^(0x)?[0-9a-fA-F]{132}$/,
			message: "waddress invalid",
			description: colors.magenta("input receiver waddress"),
			required: true
		}
	}
};

module.exports = privacyAddrSchema;
