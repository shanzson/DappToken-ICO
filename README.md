# What is Dapp-Token ICO?
  DappToken ICO is an ERC-20 token on Ethereum and aims to raise about 12.5 Million dollars in ETH. This happens via a minted, capped, finalizable, timed and whitlisted crowdsale. The conversion from ETH to USD is dynamic as it uses Chainlink price feeds to achieve this.

# What is the total supply of Dapp-Tokens?
  The total supply of Dapp-Tokens is capped at 50 Billion.

# How is the token ditribution of Dapp-Tokens?
  The token distribution of these tokens are as follows-
  - 30% for Reserve wallet
  - 25% for Token Sale
  - 20% for Interest payout wallet
  - 13% for Company general fund wallet
  - 10% for Team's HR wallet
  - 2% for Airdrop and Bounties

# What are the stages in which the Crowdsale happens?
  The crowdsale happens in 3 stages- Private ICO, Presale ICO and Crowdsale ICO. 

# How to Run?
- Run `npm install` or `yarn` to install the dependencies
- Run `truffle compile`
- Run `truffle migrate --reset`

# Tests
- Make sure that you have ganache-cli running in the terminal. Use the command `ganache-cli` 
- In another terminal, run this command for testing the first test file 
```
truffle test ./test/DappTokenTest.js
```
- Now, run this command for testing the second test file 
```
truffle test ./test/DappTokenCrowdsaleTest.js
```
- Alternatively, you can use `truffle test` command to run all the tests

![](/images/photofirst.PNG)


![](/images/photo2.PNG)

# Notes and References

- [Using Openzeppelin Version 2.5](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/release-v2.5.0/contracts/token/ERC20 )
- [Chainlink Smart Contract Kit](https://github.com/smartcontractkit/truffle-starter-kit)
- [Chainlink Get Latest Price](https://docs.chain.link/docs/get-the-latest-price/)
- [Testing Bignumber in Solidity](https://ethereum.stackexchange.com/questions/67087/how-to-use-bignumbers-in-truffle-tests)
- [Openzeppelin Crowdsale Docs Version 2.0 ](https://docs.openzeppelin.com/contracts/2.x/api/crowdsale#Crowdsale-constructor-uint256-address-payable-contract-IERC20-)
- [Overriding Crowdsale Contract](https://forum.openzeppelin.com/t/crowdsale-contract-typeerror-overriding-function-changes-state-mutability-from-view-to-nonpayable/6309)
- [Wei to Dollar Price](https://www.cryps.info/en/Wei_to_USD/1/)
- [Exporting Node Modules and helpers](https://www.freecodecamp.org/news/node-module-exports-explained-with-javascript-export-function-examples/)
- [Truffle plugin Verify](https://www.npmjs.com/package/truffle-plugin-verify-ftm)
