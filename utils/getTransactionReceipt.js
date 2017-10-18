
// todo: use web3.eth.getTransactionReceipt bt txHash
function getTransactionReceipt(web3, txHash) {
	return new Promise((success, fail) => {
		let filter = web3.eth.filter('latest');
		let blockAfter = 0;
		
		filter.watch((err, blockHash) => {
			if (err) {
				console.log("err: "+err);
			} else {
				let receipt = web3.eth.getTransactionReceipt(txHash);
				blockAfter += 1;
				if (receipt) {
					filter.stopWatching();
					console.log('receipt: ', receipt);
					success(receipt);
					return receipt;
				} else if (blockAfter > 6) {
					fail("Get receipt timeout");
				}
			}
		});
	});
}

module.exports = getTransactionReceipt;
