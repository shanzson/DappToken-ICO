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
- ERC20Standard file in previous Openzeppelin-contracts is now ERC20 in Openzeppelin Version 2.5
- [Using Openzeppelin Version 2.5](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/release-v2.5.0/contracts/token/ERC20 )
- [Chainlink Smart Contract Kit](https://github.com/smartcontractkit/truffle-starter-kit)
- [Chainlink Get Latest Price](https://docs.chain.link/docs/get-the-latest-price/)
- [Testing Bignumber in Solidity](https://ethereum.stackexchange.com/questions/67087/how-to-use-bignumbers-in-truffle-tests)
- [Openzeppelin Crowdsale Docs Version 2.0 ](https://docs.openzeppelin.com/contracts/2.x/api/crowdsale#Crowdsale-constructor-uint256-address-payable-contract-IERC20-)
- [Overriding Crowdsale Contract](https://forum.openzeppelin.com/t/crowdsale-contract-typeerror-overriding-function-changes-state-mutability-from-view-to-nonpayable/6309)
- [Wei to Dollar Price](https://www.cryps.info/en/Wei_to_USD/1/)
- [Exporting Node Modules and helpers](https://www.freecodecamp.org/news/node-module-exports-explained-with-javascript-export-function-examples/)
- [Truffle plugin Verify](https://www.npmjs.com/package/truffle-plugin-verify-ftm)
