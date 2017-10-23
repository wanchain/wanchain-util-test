var colors = require("colors/safe");

var OrdinaryKeystoreSchema = {
	properties: {
		OrdinaryKeystore: {
			pattern: 'mykeystore',
			message: 'the file of keystore is mykeystore, so you should input mykeystore',
			description: colors.magenta("input keystore file name"),
			required: true
		}
	}
};

module.exports = OrdinaryKeystoreSchema;