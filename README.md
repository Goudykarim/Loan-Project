# Collateralized Loan Smart Contract

This project is a decentralized application (dApp) on the Ethereum blockchain that implements a collateralized loan system. Users can deposit Ether (ETH) as collateral to request a loan, which other users can then fund to earn interest. The entire process is managed by a secure and transparent Solidity smart contract.

---

## Project Overview

The smart contract provides a peer-to-peer lending platform where borrowers can leverage their digital assets to secure loans, and lenders can provide capital to earn a return. The contract automates the management of loan terms, repayments, and collateral claims in case of default.

---

## Key Features

* **Deposit & Request**: Borrowers can deposit ETH as collateral and request a loan equivalent to 50% of their collateral's value (Loan-to-Value ratio).
* **Fund Loan**: Lenders can browse open loan requests and fund them by sending the requested loan amount to the contract.
* **Repay Loan**: Borrowers can repay their loan at any time before the due date. The repayment amount includes the principal plus the agreed-upon interest.
* **Claim Collateral**: If a borrower fails to repay the loan by the due date, the lender has the right to claim the entire collateral.
* **Standout Feature - Early Repayment Rebate**: To incentivize timely repayments, the contract includes a rebate feature. If a borrower repays their loan more than one day before the due date, they receive a 10% discount on the calculated interest.

---

## Tech Stack & Environment

* **Solidity**: Used for writing the smart contract logic.
* **Hardhat**: Development environment for compiling, deploying, testing, and debugging the contract.
* **Ethers.js**: A comprehensive library for interacting with the Ethereum blockchain and smart contracts.
* **Chai**: Assertion library used for writing test cases.

---

## Contract Deployment & Testing

The contract has been fully developed and tested locally using the Hardhat network. All 7 test cases, covering all core functionalities including loan requests, funding, repayment, the early repayment rebate, collateral claims, and error handling, have passed successfully.
rm -rf .git
Due to regional restrictions and faucet requirements for a mainnet ETH balance, I was unable to acquire Sepolia test ETH to deploy the contract to the public testnet.

As proof of the contract's functionality, here is the complete output from the successful Hardhat test run:

**Test Run Output:**

* Compiled 2 Solidity files successfully (evm target: paris).
* **CollateralizedLoan**
    * **Loan Request**
        * ✔ Should let a borrower deposit collateral and request a loan (825ms)
    * **Funding a Loan**
        * ✔ Allows a lender to fund a requested loan
    * **Repaying a Loan**
        * ✔ Enables the borrower to repay the loan fully with interest
        * ✔ Should apply a rebate for early repayment
    * **Claiming Collateral**
        * ✔ Permits the lender to claim collateral if the loan isn't repaid on time
    * **Error Handling**
        * ✔ Should revert when trying to fund a non-existent loan
        * ✔ Should revert when claiming collateral before due date
* **7 passing (957ms)**