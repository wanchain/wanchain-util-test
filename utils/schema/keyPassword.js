var colors = require("colors/safe");

var keyPasswordSchema = {
	properties: {
		keyPassword: {
			pattern: 'wanglu',
			message: "the keystore's password is wanglu",
			description: colors.magenta("input keystore's password"),
			required: true
		}
	}
};

module.exports = keyPasswordSchema;