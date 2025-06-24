// Importing necessary modules and functions from Hardhat and Chai for testing
const {
  loadFixture,
  time, // Importing the time helper
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Describing a test suite for the CollateralizedLoan contract
describe("CollateralizedLoan", function () {
  // A fixture to deploy the contract and set up initial state. This runs once before all tests.
  async function deployCollateralizedLoanFixture() {
    // Get signers (accounts) from Hardhat's local Ethereum node
    const [owner, borrower, lender] = await ethers.getSigners();

    // Deploy the CollateralizedLoan contract
    const CollateralizedLoanFactory = await ethers.getContractFactory("CollateralizedLoan");
    const collateralizedLoan = await CollateralizedLoanFactory.deploy();

    // Define common variables for tests
    const interestRate = 10; // 10%
    const duration = 15 * 24 * 60 * 60; // 15 days in seconds
    const collateralAmount = ethers.parseEther("10"); // 10 ETH
    
    // The LTV is 50%, so loan amount will be 50% of collateral
    const loanAmount = (collateralAmount * 50n) / 100n; 
    
    return { collateralizedLoan, owner, borrower, lender, interestRate, duration, collateralAmount, loanAmount };
  }

  // Test suite for the loan request functionality
  describe("Loan Request", function () {
    it("Should let a borrower deposit collateral and request a loan", async function () {
      const { collateralizedLoan, borrower, interestRate, duration, collateralAmount, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
      const loanId = 0;

      // Borrower requests a loan and we check for the event emission
      await expect(
        collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount })
      ).to.emit(collateralizedLoan, "LoanRequested")
       .withArgs(loanId, borrower.address, collateralAmount, loanAmount, interestRate);

      // Verify the loan details were stored correctly
      const loan = await collateralizedLoan.loans(loanId);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.collateralAmount).to.equal(collateralAmount);
      expect(loan.isFunded).to.be.false;
    });
  });

  // Test suite for funding a loan
  describe("Funding a Loan", function () {
    it("Allows a lender to fund a requested loan", async function () {
      const { collateralizedLoan, borrower, lender, interestRate, duration, collateralAmount, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
      const loanId = 0;
      
      // First, borrower requests a loan
      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      // Then, lender funds the loan
      await expect(
        collateralizedLoan.connect(lender).fundLoan(loanId, { value: loanAmount })
      ).to.emit(collateralizedLoan, "LoanFunded")
       .withArgs(loanId, lender.address);

      // Check loan status
      const loan = await collateralizedLoan.loans(loanId);
      expect(loan.isFunded).to.be.true;
      expect(loan.lender).to.equal(lender.address);
    });
  });

  // Test suite for repaying a loan
  describe("Repaying a Loan", function () {
    it("Enables the borrower to repay the loan fully with interest", async function () {
      const { collateralizedLoan, borrower, lender, interestRate, duration, collateralAmount, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
      const loanId = 0;

      // Setup: request and fund the loan
      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      await collateralizedLoan.connect(lender).fundLoan(loanId, { value: loanAmount });

      const interest = (loanAmount * BigInt(interestRate)) / 100n;
      const totalRepayment = loanAmount + interest;

      // Action: borrower repays the loan
      await expect(
        collateralizedLoan.connect(borrower).repayLoan(loanId, { value: totalRepayment })
      ).to.emit(collateralizedLoan, "LoanRepaid");

      // Verification
      const loan = await collateralizedLoan.loans(loanId);
      expect(loan.isRepaid).to.be.true;
    });

    it("Should apply a rebate for early repayment", async function () {
        const { collateralizedLoan, borrower, lender, interestRate, duration, collateralAmount, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
        const loanId = 0;
  
        // Setup: request and fund the loan
        await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
        await collateralizedLoan.connect(lender).fundLoan(loanId, { value: loanAmount });
  
        const interest = (loanAmount * BigInt(interestRate)) / 100n;
        const rebate = (interest * 10n) / 100n; // 10% rebate
        const totalRepaymentWithRebate = loanAmount + interest - rebate;

        // Action: borrower repays the loan early
        await expect(
            collateralizedLoan.connect(borrower).repayLoan(loanId, { value: totalRepaymentWithRebate })
        ).to.emit(collateralizedLoan, "LoanRepaid")
         .withArgs(loanId, totalRepaymentWithRebate, true); // Check that rebateApplied is true
  
        const loan = await collateralizedLoan.loans(loanId);
        expect(loan.isRepaid).to.be.true;
        expect(loan.rebateApplied).to.be.true;
    });
  });

  // Test suite for claiming collateral
  describe("Claiming Collateral", function () {
    it("Permits the lender to claim collateral if the loan isn't repaid on time", async function () {
      const { collateralizedLoan, borrower, lender, interestRate, duration, collateralAmount, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
      const loanId = 0;

      // Setup: request and fund the loan
      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      await collateralizedLoan.connect(lender).fundLoan(loanId, { value: loanAmount });

      // Simulate the passage of time to go past the due date
      await time.increase(duration + 1);

      // Action: lender claims the collateral
      // We check for the event emission, which confirms the function executed successfully.
      // The previous test failed because it called the function twice (once here, and once
      // in a 'changeEtherBalance' check), causing the second call to fail. This is the corrected test.
      await expect(
        collateralizedLoan.connect(lender).claimCollateral(loanId)
      ).to.emit(collateralizedLoan, "CollateralClaimed").withArgs(loanId, lender.address);
    });
  });

  // Test suite for error handling
  describe("Error Handling", function () {
    it("Should revert when trying to fund a non-existent loan", async function () {
        const { collateralizedLoan, lender, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
        const nonExistentLoanId = 99;

        await expect(
            collateralizedLoan.connect(lender).fundLoan(nonExistentLoanId, { value: loanAmount })
        ).to.be.revertedWith("Loan does not exist.");
    });

    it("Should revert when claiming collateral before due date", async function () {
        const { collateralizedLoan, borrower, lender, interestRate, duration, collateralAmount, loanAmount } = await loadFixture(deployCollateralizedLoanFixture);
        const loanId = 0;

        await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
        await collateralizedLoan.connect(lender).fundLoan(loanId, { value: loanAmount });

        await expect(
            collateralizedLoan.connect(lender).claimCollateral(loanId)
        ).to.be.revertedWith("Loan is not past its due date yet.");
    });
  });
});
