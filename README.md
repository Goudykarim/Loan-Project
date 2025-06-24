# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
### Contract Deployment

The contract has been fully developed and tested locally. All 7 test cases, covering all core functionalities including loan requests, funding, repayment, collateral claims, and error handling, have passed successfully.

Due to regional restrictions and faucet requirements for a mainnet ETH balance, I was unable to acquire Sepolia test ETH to deploy the contract to the public testnet.

As proof of the contract's functionality, here is the complete output from the successful Hardhat test run:

[Compiled 2 Solidity files successfully (evm target: paris).


  CollateralizedLoan
    Loan Request
      ✔ Should let a borrower deposit collateral and request a loan (825ms)
    Funding a Loan
      ✔ Allows a lender to fund a requested loan
    Repaying a Loan
      ✔ Enables the borrower to repay the loan fully with interest
      ✔ Should apply a rebate for early repayment
    Claiming Collateral
      ✔ Permits the lender to claim collateral if the loan isn't repaid on time
    Error Handling
      ✔ Should revert when trying to fund a non-existent loan
      ✔ Should revert when claiming collateral before due date


  7 passing (957ms)]
