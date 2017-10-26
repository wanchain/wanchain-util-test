var fs = require('fs');
var ethUtil = require('ethereumjs-util');
var wanUtil = require('wanchain-util');
var ethUtilCrypto = require('crypto');
var ethUtilScrypt = require('scryptsy');
var ethUtilUuid = require('uuid');
var path = require('path');


function createKeystore(password, fileName, wanchainLog) {
	var filename = __dirname + '/keystore/' + fileName + '.json';
	var result = [];

	try {
		fs.readFileSync(filename, 'utf8');

		result = [false];
		return result;

	} catch (e) {
		var Crypto = [];
		var privKey = [];

		for (var i=0; i<2; i++) {

			var salt = ethUtilCrypto.randomBytes(32);
			var iv = ethUtilCrypto.randomBytes(16);
			var derivedKey;
			var kdf = 'scrypt';
			var kdfparams = {
				dklen: 32,
				salt: salt.toString('hex')
			};

			// FIXME: support progress reporting callback
			kdfparams.n = 1024;
			kdfparams.r = 8;
			kdfparams.p = 1;
			derivedKey = ethUtilScrypt(new Buffer(password), salt, kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);

			privKey.push(derivedKey);

			var cipher = ethUtilCrypto.createCipheriv('aes-128-ctr', derivedKey.slice(0, 16), iv);
			if (!cipher) {
				throw new Error('Unsupported cipher')
			}

			var privkeyRandom = ethUtilCrypto.randomBytes(32);
			var privkey = Buffer(privkeyRandom, 'hex');

			var ciphertext = Buffer.concat([cipher.update(privkey), cipher.final()]);

			var mac = wanUtil.ethereumUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), new Buffer(ciphertext, 'hex')]));

			Crypto.push(
				{
					ciphertext: ciphertext.toString('hex'),
					cipherparams: { iv: iv.toString('hex') },
					cipher: 'aes-128-ctr',
					kdf: kdf,
					kdfparams: kdfparams,
					mac: mac.toString('hex')
				}
			)
		}

		var waddress = wanUtil.ethereumUtil.generateWaddrFromPriv(privKey[0], privKey[1]);
		var address = '0x' + ethUtil.privateToAddress(privKey[0]).toString('hex');

		var data = {
			version: 3,
			id: ethUtilUuid.v4({
				random: ethUtilCrypto.randomBytes(16)
			}),
			address: address.toString('hex'),
			crypto: Crypto[0],
			crypto2: Crypto[1],
			waddress: waddress
		};

		result = [true, data];

		fs.writeFileSync(filename, JSON.stringify(result));
		wanchainLog('\naddress: ' + data.address + '\nwaddress: ' + data.waddress + '\npassword: ' + password + '\nfilePath: ' + filename, '\x1b[32m');
		console.log('the keystore file has create success!');
		return result;
	}
}

// var result = createKeystore('wanchain', 'testkey1');
// console.log(result);

module.exports = createKeystore;
