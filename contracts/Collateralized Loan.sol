// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "hardhat/console.sol";

/**
 * @title CollateralizedLoan
 * @dev A smart contract that allows users to take out loans by providing ETH as collateral.
 * Lenders can fund these loans to earn interest. This contract includes a rebate
 * feature for early repayments as a standout implementation.
 */
contract CollateralizedLoan {
    // --- State Variables ---

    // Struct to define the properties of a loan.
    struct Loan {
        address borrower;         // The address of the person taking the loan.
        address lender;           // The address of the person funding the loan.
        uint collateralAmount;   // The amount of ETH locked as collateral.
        uint loanAmount;         // The amount of the loan requested by the borrower.
        uint interestRate;       // The annual interest rate (e.g., 5 for 5%).
        uint dueDate;            // The timestamp when the loan is due.
        bool isFunded;           // Flag to check if the loan has been funded.
        bool isRepaid;           // Flag to check if the loan has been repaid.
        bool rebateApplied;      // Flag to check if an early repayment rebate was given.
    }

    // Mapping from a unique loan ID to the Loan struct.
    mapping(uint => Loan) public loans;
    uint public nextLoanId; // A counter to ensure each loan has a unique ID.

    // Loan-to-Value (LTV) ratio. For every 100 wei of collateral, 50 wei can be borrowed.
    uint public constant LTV_RATIO = 50; 

    // Rebate for early repayment. 10% discount on the interest.
    uint public constant REBATE_PERCENT = 10;

    // --- Events ---

    event LoanRequested(uint indexed loanId, address indexed borrower, uint collateralAmount, uint loanAmount, uint interestRate);
    event LoanFunded(uint indexed loanId, address indexed lender);
    event LoanRepaid(uint indexed loanId, uint totalPaid, bool rebateApplied);
    event CollateralClaimed(uint indexed loanId, address indexed lender);

    // --- Modifiers ---

    // Ensures that a function is called for a loan that actually exists.
    modifier loanExists(uint _loanId) {
        require(loans[_loanId].borrower != address(0), "Loan does not exist.");
        _;
    }

    // Ensures that a loan has not been funded yet.
    modifier notFunded(uint _loanId) {
        require(!loans[_loanId].isFunded, "Loan is already funded.");
        _;
    }

    // --- Functions ---

    /**
     * @dev Allows a user to deposit ETH as collateral and request a loan.
     * The loan amount is calculated based on the collateral and the LTV_RATIO.
     * @param _interestRate The desired annual interest rate for the loan.
     * @param _duration The duration of the loan in seconds.
     */
    function depositCollateralAndRequestLoan(uint _interestRate, uint _duration) external payable {
        require(msg.value > 0, "Collateral must be greater than 0.");
        require(_interestRate > 0 && _interestRate <= 100, "Interest rate must be between 1 and 100.");
        require(_duration > 0, "Duration must be greater than 0.");

        uint loanId = nextLoanId;
        uint loanAmount = (msg.value * LTV_RATIO) / 100;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            lender: address(0), // Lender is not known yet.
            collateralAmount: msg.value,
            loanAmount: loanAmount,
            interestRate: _interestRate,
            dueDate: block.timestamp + _duration,
            isFunded: false,
            isRepaid: false,
            rebateApplied: false
        });

        nextLoanId++;
        emit LoanRequested(loanId, msg.sender, msg.value, loanAmount, _interestRate);
    }

    /**
     * @dev Allows a lender to fund an existing loan request.
     * The lender must send the exact loan amount.
     * @param _loanId The ID of the loan to fund.
     */
    function fundLoan(uint _loanId) external payable loanExists(_loanId) notFunded(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.value == loan.loanAmount, "Must send the exact loan amount.");
        
        loan.lender = msg.sender;
        loan.isFunded = true;

        // Transfer the loan amount to the borrower
        (bool success, ) = loan.borrower.call{value: loan.loanAmount}("");
        require(success, "Failed to send loan amount to borrower.");

        emit LoanFunded(_loanId, msg.sender);
    }

    /**
     * @dev Allows the borrower to repay the loan to the lender.
     * The repayment amount includes the principal plus calculated interest.
     * An interest rebate is applied if repaid early.
     * @param _loanId The ID of the loan to repay.
     */
    function repayLoan(uint _loanId) external payable loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.sender == loan.borrower, "Only the borrower can repay the loan.");
        require(loan.isFunded, "Loan has not been funded yet.");
        require(!loan.isRepaid, "Loan has already been repaid.");

        uint interest = (loan.loanAmount * loan.interestRate) / 100;
        uint totalDue = loan.loanAmount + interest;
        bool rebateApplied = false;

        // Apply a rebate if the loan is paid back with more than 1 day to spare
        if (block.timestamp < loan.dueDate - 1 days) {
            uint rebateAmount = (interest * REBATE_PERCENT) / 100;
            totalDue -= rebateAmount;
            rebateApplied = true;
        }

        require(msg.value >= totalDue, "Insufficient amount sent for repayment.");
        
        loan.isRepaid = true;
        loan.rebateApplied = rebateApplied;

        // Transfer the repayment to the lender.
        (bool successLender, ) = loan.lender.call{value: totalDue}("");
        require(successLender, "Failed to send repayment to lender.");

        // Return the collateral to the borrower.
        (bool successBorrower, ) = loan.borrower.call{value: loan.collateralAmount}("");
        require(successBorrower, "Failed to return collateral to borrower.");

        // If there's any overpayment, return it to the borrower.
        if (msg.value > totalDue) {
            (bool successOverpayment, ) = loan.borrower.call{value: msg.value - totalDue}("");
            require(successOverpayment, "Failed to refund overpayment.");
        }
        
        emit LoanRepaid(_loanId, totalDue, rebateApplied);
    }

    /**
     * @dev Allows the lender to claim the collateral if the loan is not repaid by the due date.
     * @param _loanId The ID of the loan to claim collateral from.
     */
    function claimCollateral(uint _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.sender == loan.lender, "Only the lender can claim collateral.");
        require(loan.isFunded, "Loan was not funded.");
        require(!loan.isRepaid, "Loan has already been repaid.");
        require(block.timestamp >= loan.dueDate, "Loan is not past its due date yet.");

        // Transfer the collateral to the lender.
        (bool success, ) = loan.lender.call{value: loan.collateralAmount}("");
        require(success, "Failed to transfer collateral to lender.");
        
        emit CollateralClaimed(_loanId, loan.lender);
    }
}
