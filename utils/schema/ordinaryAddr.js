var colors = require("colors/safe");

var ordinaryAddrSchema = {
	properties: {
		address: {
			pattern: /^(0x)?[0-9a-fA-F]{40}$/,
			message: "address invalid",
			description: colors.magenta("input receiver address"),
			required: true
		}
	}
};

module.exports = ordinaryAddrSchema;
