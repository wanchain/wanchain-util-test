let fs = require('fs');
let ethUtil = require('ethereumjs-util');
let wanEthUtil = require('wanchain-util');
let ethUtilCrypto = require('crypto');
let ethUtilScrypt = require('scryptsy');
let ethUtilUuid = require('uuid');

toV3 = function (password, opts) {
	var Crypto = [];
	var privKey = [];

	for (var i=0; i<2; i++) {
		opts = opts || {};
		var salt = opts.salt || ethUtilCrypto.randomBytes(32);
		var iv = opts.iv || ethUtilCrypto.randomBytes(16);
		var derivedKey;
		var kdf = opts.kdf || 'scrypt';
		var kdfparams = {
			dklen: opts.dklen || 32,
			salt: salt.toString('hex')
		};

		if (kdf === 'pbkdf2') {
			kdfparams.c = opts.c || 262144;
			kdfparams.prf = 'hmac-sha256';
			derivedKey = ethUtilCrypto.pbkdf2Sync(new Buffer(password), salt, kdfparams.c, kdfparams.dklen, 'sha256');
			privKey.push(derivedKey);
		} else if (kdf === 'scrypt') {
			// FIXME: support progress reporting callback
			kdfparams.n = opts.n || 262144;
			kdfparams.r = opts.r || 8;
			kdfparams.p = opts.p || 1;
			derivedKey = ethUtilScrypt(new Buffer(password), salt, kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
			privKey.push(derivedKey);
		} else {
			throw new Error('Unsupported kdf')
		}
		var cipher = ethUtilCrypto.createCipheriv(opts.cipher || 'aes-128-ctr', derivedKey.slice(0, 16), iv);
		if (!cipher) {
			throw new Error('Unsupported cipher')
		}

		var ciphertext = Buffer.concat([cipher.update(ethUtilCrypto.randomBytes(32)), cipher.final()]);

		var mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), new Buffer(ciphertext, 'hex')]));

		Crypto.push(
			{
				ciphertext: ciphertext.toString('hex'),
				cipherparams: {
					iv: iv.toString('hex')
				},
				cipher: opts.cipher || 'aes-128-ctr',
				kdf: kdf,
				kdfparams: kdfparams,
				mac: mac.toString('hex')
			}
		)
	}

	var waddress = wanEthUtil.ethereumUtil.generateWaddrFromPriv(privKey[0], privKey[1]);

	var result = {
		version: 3,
		id: ethUtilUuid.v4({
			random: opts.uuid || ethUtilCrypto.randomBytes(16)
		}),
		crypto: Crypto[0],
		crypto2: Crypto[1],
		waddress: waddress,
		address: '0x' + ethUtil.privateToAddress(privKey[0]).toString('hex')
	};

	console.log('keystore: ', result);

	return result;
};

main = function () {
	let password = '123456';
	let opts = {
		kdf: 'scrypt',
		n: 1024
	};

	let keystore = toV3(password, opts);
	fs.writeFileSync('keystore-test.json', JSON.stringify(keystore));

};

main();

