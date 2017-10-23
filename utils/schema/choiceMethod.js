var colors = require("colors/safe");

var methodSchema = {
	properties: {
		method: {
			pattern: /[1]|[2]|[3]/,
			message: "pls input 1(Ordinary Transaction), 2(Privacy Transaction), 3(Check the balance): 1 or 2 or 3",
			description: colors.magenta("choice method"),
			required: true
		}
	}
};

module.exports = methodSchema;
