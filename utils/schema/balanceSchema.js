var colors = require("colors/safe");

var balanceSchema = {
	properties: {
		balance: {
			pattern: /^(0x)?[0-9a-fA-F]{40}$/,
			message: 'address invalid!',
			description: colors.magenta("input you search address"),
			required: true
		}
	}
};

module.exports = balanceSchema;