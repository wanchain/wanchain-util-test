var colors = require("colors/safe");

var ordinaryAddrSchema = {
	properties: {
		address: {
			pattern: '0x08d972cc3a0246bda92cdffb28051dd5914faeeb',
			message: "this test only use 0x08d972cc3a0246bda92cdffb28051dd5914faeeb",
			description: colors.magenta("input receiver address"),
			required: true
		}
	}
};

module.exports = ordinaryAddrSchema;
