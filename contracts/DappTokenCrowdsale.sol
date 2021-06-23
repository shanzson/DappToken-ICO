pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundablePostDeliveryCrowdsale.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract DappTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, WhitelistCrowdsale, RefundablePostDeliveryCrowdsale, Ownable{
	// Minimum investor contribution - 0.002 Ether
	// Maximum investor contribution - 50 Ether
	uint256 public investorMincap = 2000000000000000; //0.002 ether, here 2*10^15 wei
	uint256 public investorHardcap = 50000000000000000000; //50 ether, here 50*10^18
	mapping(address => uint256) public contributions;
	address token_address;
	//Crowdsale stages
	// enum CrowdsaleStage{ PreICO, ICO }

	//Default to presale stage
	// CrowdsaleStage public stage = CrowdsaleStage.PreICO;

	// Token Distribution
	  uint256 public tokenSalePercentage   = 70;
	  uint256 public foundersPercentage    = 10;
	  uint256 public foundationPercentage  = 10;
	  uint256 public partnersPercentage    = 10;

	constructor(
		uint256 rate, 
		address payable wallet, 
		ERC20 _token, 
		uint256 cap,
		uint256 openingTime,
		uint256 closingTime,
		uint256 goal
		) 
	Crowdsale(rate, wallet, _token)
	CappedCrowdsale(cap)
	TimedCrowdsale(openingTime, closingTime)
	RefundableCrowdsale(goal)
	public {
		require(goal <= cap);
		token_address = address(_token);
	}

	function getUserContribution(address _beneficiary) 
		public view returns (uint256){
    		return contributions[_beneficiary];
  	}

  	//Allows admin to update Crowdsale stage
  	// function setCrowdsaleStage(uint _stage) public onlyOwner{
  	// 	if(uint(CrowdsaleStage.PreICO) == _stage){
  	// 		stage = CrowdsaleStage.PreICO;
  	// 	} 
  	// 	else if(uint(CrowdsaleStage.ICO) == _stage) {
  	// 		stage = CrowdsaleStage.ICO;
  	// 	}
  	// }

	function _updatePurchasingState(
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

	function _finalization() internal {
		if(goalReached()) {
			// Finish minting the tokens
			ERC20Mintable _minteableToken = ERC20Mintable(token_address); 
			// Unpause the token
			// ERC20Pausable e = ERC20Pausable(token);
			// pausableToken.transferOwnership(wallet);
		}

		super._finalization();
	}

}