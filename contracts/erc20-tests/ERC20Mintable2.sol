// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "./ERC20Mintable.sol";

contract ERC20Mintable2 is ERC20Mintable { 
    constructor() ERC20Mintable() public {
    }   
}
