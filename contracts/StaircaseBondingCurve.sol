// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "./openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./openzeppelin/contracts/token/ERC20/ERC20.sol";

/** mint tokens based on a price that is a stepwise function on the total supply */
contract StaircaseBondingCurve is ERC20 {

    using SafeMath for uint256;
    uint256 MEGAS = 1000000;

    /** the current step number in the staircase function */
    uint256[] public steps;
    uint256[] public pricesM;

    uint256 public initSupply;
    uint8 public step = 0;
    address payable public beneficiary;

    IERC20 public baseToken;

    constructor(
        IERC20 _baseToken, 
        uint256[] memory _steps, 
        uint256[] memory _pricesM, 
        uint256 _initSupply, 
        address payable _beneficiary) 
        ERC20("_Prtcl Native Token", "UPR") public {

        baseToken = _baseToken;
        steps = _steps;
        pricesM = _pricesM;

        beneficiary = _beneficiary;
        
        _mint(msg.sender, _initSupply);

        initSupply = _initSupply;
    }

    function getSteps() public view returns (uint256[] memory) {
        return steps;
    }

    function getPricesM() public view returns (uint256[] memory) {
        return pricesM;
    }

    function mintCost(uint256 amount) public view returns(uint256, uint8) {
        uint256 unspent = amount;
        // the bonding curve applies to new tokens only
        uint256 supply0 = totalSupply().sub(initSupply);
        uint256 supply = supply0;
        uint256 cost = 0;
        uint8 stepTemp = step;
        
        while(unspent > 0) {
            uint256 spentOnStep = 0;
            if (stepTemp >= (steps.length - 1)) {
                // on last step
                spentOnStep = unspent;
            } else {
                uint256 availableOnStep = steps[stepTemp + 1].sub(supply);
                if (availableOnStep >= unspent) {
                    spentOnStep = unspent;
                } else {
                    spentOnStep = availableOnStep;
                }
            }

            uint256 costStepM = pricesM[stepTemp].mul(spentOnStep);
            uint256 costStepMremainer = costStepM % MEGAS;
            // roundup
            if (costStepMremainer > 0) {
                costStepM = costStepM + (MEGAS - costStepMremainer);
            }
            uint256 costStep = costStepM.div(MEGAS);
           
            unspent = unspent.sub(spentOnStep);
            supply = supply.add(spentOnStep);
            cost = cost.add(costStep);
            
            if (unspent > 0) {
                stepTemp = stepTemp + 1;
            }
        }

        require(supply == supply0.add(amount), "should have consumed the whole amount");
        
        return (cost, stepTemp);
    }

    /** Mints amount tokens to address "account" by transferring the an amount of baseTokens 
        defined by the price() function to the beneficiary */
    function mint(address account, uint256 amount) public payable {
        (uint256 cost, uint8 newStep) = mintCost(amount);
        step = newStep;

        if (address(baseToken) != address(0)) {
            baseToken.transferFrom(msg.sender, beneficiary, cost);
        } else {
            require(msg.value >= cost, "funds sent not enough");
            beneficiary.transfer(msg.value);
        }

        _mint(account, amount);
    }

    
}