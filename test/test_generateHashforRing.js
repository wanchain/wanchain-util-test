const BN = require('bn.js');

generateHashforRing = (fromAddr, value) => {
	let h = new Buffer(32);
	h.fill(0);

	let fb = new Buffer(fromAddr, 'hex');
	fb.copy(h);
	h[20] = 0x02;

	let vbn = new BN(value, 10);
	let vb = vbn.toBuffer();
	let vb1 = vb.length;
	h[21] = vb1;
	h[22] = 0x00;
	h[23] = 132;

	console.log('h', h);
	return h;
};

generateHashforRing('0x26f622cf9d23501e51a46055a2abc4a6c3d2e41a', '200000000000000000');