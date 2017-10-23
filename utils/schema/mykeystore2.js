var colors = require("colors/safe");

var OrdinaryKeystoreSchema = {
	properties: {
		OrdinaryKeystore: {
			pattern: 'mykeystore2',
			message: 'the file of keystore is mykeystore2, so you should input mykeystore2',
			description: colors.magenta("input keystore file name"),
			required: true
		}
	}
};

module.exports = OrdinaryKeystoreSchema;