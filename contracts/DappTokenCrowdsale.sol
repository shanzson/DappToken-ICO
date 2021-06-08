pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";


contract DappTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale{
	// Minimum investor contribution - 0.002 Ether
	// Maximum investor contribution - 50 Ether
	uint256 public investorMincap = 2000000000000000; //0.002 ether, here 2*10^15 wei
	uint256 public investorHardcap = 50000000000000000000; //50 ether, here 50*10^18
	mapping(address => uint256) public contributions;

	constructor(
		uint256 rate, 
		address payable wallet, 
		IERC20 token, 
		uint256 cap,
		uint256 openingTime,
		uint256 closingTime
		) 
	Crowdsale(rate, wallet, token)
	CappedCrowdsale(cap)
	TimedCrowdsale(openingTime, closingTime)
	public {

	}

	function getUserContribution(address _beneficiary) 
		public view returns (uint256){
    		return contributions[_beneficiary];
  	}

	function _preValidatePurchase(
		address beneficiary,
		uint256 weiAmount
	)
		internal
	{
		super._preValidatePurchase(beneficiary, weiAmount);
		uint256 _existingContribution = contributions[beneficiary];
		uint256 _newContribution = _existingContribution.add(weiAmount);
		require(_newContribution >= investorMincap && _newContribution <= investorHardcap);
		contributions[beneficiary] = _newContribution;
	}

}