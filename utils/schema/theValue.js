var colors = require("colors/safe");

var ordinaryValueSchema = {
	properties: {
		value: {
			pattern: /^[+]{0,1}(\d+)$|^[+]{0,1}(\d+\.\d+)$/,
			message: "value invalid!",
			description: colors.magenta("input value"),
			required: true
		}
	}
};

module.exports = ordinaryValueSchema;
