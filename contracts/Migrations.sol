// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

//***********************EattheBlocks**********************
// import 'openzeppelin/contracts/Crowdsale/Crowdsale.sol';
// import 'openzeppelin/contracts/token/ERC20/IERC20.sol';
// import 'openzeppelin/contracts/Crowdsale/distribution/PostDeliveryCrowdsale.sol';

// contract ICO is Crowdsale, PostDeliveryCrowdsale{
//   constructor(
//     uint rate,
//     address payable wallet,
//     IERC20 token
//   ) Crowdsale (rate, wallet, token) 
//   public{}
// }
//************************EattheBlocks**********************

contract Migrations {
  address public owner = msg.sender;
  uint public last_completed_migration;

  modifier restricted() {
    require(
      msg.sender == owner,
      "This function is restricted to the contract's owner"
    );
    _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
