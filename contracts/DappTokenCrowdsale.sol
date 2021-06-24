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
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract ERC20PausableExtended is ERC20Pausable, Ownable {

}

contract DappTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, WhitelistCrowdsale, RefundablePostDeliveryCrowdsale{
	// Minimum investor contribution - 0.002 Ether
	// Maximum investor contribution - 50 Ether
	uint256 public investorMincap = 2000000000000000; //0.002 ether, here 2*10^15 wei
	uint256 public investorHardcap = 50000000000000000000; //50 ether, here 50*10^18
	mapping(address => uint256) public contributions;
	address private token_address;
	address private _wallet;
	IERC20 private token_reference;
	//Crowdsale stages
	// enum CrowdsaleStage{ PreICO, ICO }

	//Default to presale stage
	// CrowdsaleStage public stage = CrowdsaleStage.PreICO;

	// Token Distribution
	  uint256 public tokenSalePercentage   = 70;
	  uint256 public foundersPercentage    = 10;
	  uint256 public foundationPercentage  = 10;
	  uint256 public partnersPercentage    = 10;

	// Token reserve funds
	  address public foundersFund;
	  address public foundationFund;
	  address public partnersFund;

	// Token time lock
	  uint256 public releaseTime;
	  address public foundersTimelock;
	  address public foundationTimelock;
	  address public partnersTimelock;

	constructor(
		uint256 rate, 
		address payable wallet, 
		IERC20 _token, 
		uint256 cap,
		uint256 openingTime,
		uint256 closingTime,
		uint256 goal,
		address _foundersFund,
	    address _foundationFund,
	    address _partnersFund,
	    uint256 _releaseTime
	) 
	Crowdsale(rate, wallet, _token)
	CappedCrowdsale(cap)
	TimedCrowdsale(openingTime, closingTime)
	RefundableCrowdsale(goal)
	public {
		require(goal <= cap);
		token_address = address(_token);
		token_reference = _token;
		
		foundersFund   = _foundersFund;
    	foundationFund = _foundationFund;
    	partnersFund   = _partnersFund;
    	releaseTime    = _releaseTime;

    	_wallet = wallet;
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
			ERC20Mintable _mintableToken = ERC20Mintable(token_address); 
			uint256 _alreadyMinted = _mintableToken.totalSupply(); //_alreadyMinted is the tokens minted as a part of tokenSalePercentage

			uint256 _finalTotalSupply = _alreadyMinted.mul(tokenSalePercentage).div(100);

		    foundersTimelock   = address(new TokenTimelock(token_reference, foundersFund, releaseTime));
		    foundationTimelock = address(new TokenTimelock(token_reference, foundationFund, releaseTime));
		    partnersTimelock   = address(new TokenTimelock(token_reference, partnersFund, releaseTime));

		    _mintableToken.mint(address(foundersTimelock),   _finalTotalSupply.mul(foundersPercentage).div(100));
		    _mintableToken.mint(address(foundationTimelock), _finalTotalSupply.mul(foundationPercentage).div(100));
		    _mintableToken.mint(address(partnersTimelock),   _finalTotalSupply.mul(partnersPercentage).div(100));


		    // Unpause the token
		    ERC20PausableExtended _pausableToken = ERC20PausableExtended(token_address);
		    // _pausableToken.unpause();
		    _pausableToken.transferOwnership(_wallet);
		}

		super._finalization();
	}

}