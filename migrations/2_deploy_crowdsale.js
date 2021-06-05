const DappToken = artifacts.require("./DappToken.sol");

module.exports = function (deployer) {
	const name = "Dapp Token";
	const symbol = "DTC";
	const decimals = 18;

  deployer.deploy(DappToken, name, symbol, decimals);
};
