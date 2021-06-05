pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


contract DappTokenCrowdsale is Crowdsale{
	constructor(uint256 rate, address payable wallet, IERC20 token) 
	Crowdsale(rate, wallet, token)
	public {

	}

}