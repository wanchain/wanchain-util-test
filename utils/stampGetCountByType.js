var config = require('../config');
var stampType = config.stampType;

// todo:
function stampGetCountByType(contractInstance, type){
	let count = 0;
	if(type === stampType.TypeOne){
		count = contractInstance.StampCountOne.call();
	}else if(type === stampType.TypeTwo) {
		count = contractInstance.StampCountTwo.call();
	}else if(type === stampType.TypeFour) {
		count = contractInstance.StampCountFour.call();
	}else if(type === stampType.TypeEight) {
		count = contractInstance.StampCountEight.call();
	}else if(type === stampType.TypeSixteen) {
		count = contractInstance.StampCountSixteen.call();
	}else{
		count = 0;
	}
	return count;
}

module.exports = stampGetCountByType;
