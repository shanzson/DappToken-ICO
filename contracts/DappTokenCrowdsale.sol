pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/PostDeliveryCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract ERC20PausableExtended is ERC20Pausable, Ownable {

}

contract DappTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, FinalizableCrowdsale, WhitelistCrowdsale, PostDeliveryCrowdsale{
	// Minimum investor contribution - 0.002 Ether
	// Maximum investor contribution - 50 Ether
	uint256 public investorMincap = 2000000000000000; //0.002 ether, here 2*10^15 wei
	uint256 public investorHardcap = 50000000000000000000; //50 ether, here 50*10^18
	mapping(address => uint256) public contributions;
	address private token_address;
	address private fundswallet;
	IERC20 private token_reference;
	// uint[] percent;

	uint8 public TokenSalePercentage = 25;
	uint8 public ReserveWalletPercentage = 30;
	uint8 public InterestPayoutWalletPercentage = 20;
	uint8 public TeamsHRPercentage = 10;
	uint8 public CompanyGeneralFundPercentage = 13;
	uint8 public AirdropPercentage = 2;

	//Crowdsale stages
	// enum CrowdsaleStage{ PreICO, ICO }

	//Default to presale stage
	// CrowdsaleStage public stage = CrowdsaleStage.PreICO;

	// Token Distribution

	// Token funds
	  address ReserveWalletFund;
	  address InterestPayoutWalletFund;
	  address TeamsHRFund;
	  address CompanyGeneralFund;
	  address AirdropFund;

	constructor(
		uint256 Rate, 
		address payable Wallet, 
		IERC20 Token, 
		uint256 _cap,
		uint256 _openingTime,
		uint256 _closingTime,
		uint256 _goal,
		address _ReserveWalletFund,
	    address _InterestPayoutWalletFund,
	    address _TeamsHRFund,
	    address _CompanyGeneralFund,
	    address _AirdropFund
	) 
	Crowdsale(Rate, Wallet, Token)
	CappedCrowdsale(_cap)
	TimedCrowdsale(_openingTime, _closingTime)
	// RefundablePostDeliveryCrowdsale(_goal)
	public {
		require(_goal <= _cap);
		token_address = address(Token);
		token_reference = Token;
		
		ReserveWalletFund = _ReserveWalletFund;
    	InterestPayoutWalletFund = _InterestPayoutWalletFund;
    	TeamsHRFund = _TeamsHRFund;
    	CompanyGeneralFund = _CompanyGeneralFund;
    	AirdropFund = _AirdropFund;
    	fundswallet = Wallet;
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
			// Finish minting the tokens
			ERC20Mintable _mintableToken = ERC20Mintable(token_address); 
			uint256 _alreadyMinted = _mintableToken.totalSupply(); //_alreadyMinted is the tokens minted as a part of TokenSalePercentage

			uint256 _finalTotalSupply = _alreadyMinted.div(TokenSalePercentage).mul(100);

		    _mintableToken.mint(address(ReserveWalletFund),   _finalTotalSupply.mul(ReserveWalletPercentage).div(100));
		    _mintableToken.mint(address(InterestPayoutWalletFund), _finalTotalSupply.mul(InterestPayoutWalletPercentage).div(100));
		    _mintableToken.mint(address(TeamsHRFund),   _finalTotalSupply.mul(TeamsHRPercentage).div(100));
		    _mintableToken.mint(address(CompanyGeneralFund),   _finalTotalSupply.mul(CompanyGeneralFundPercentage).div(100));
		    _mintableToken.mint(address(AirdropFund),   _finalTotalSupply.mul(AirdropPercentage).div(100));


		    // Unpause the token
		    ERC20PausableExtended _pausableToken = ERC20PausableExtended(token_address);
		    _pausableToken.unpause();
		    _pausableToken.transferOwnership(fundswallet);

			super._finalization();
	}

}