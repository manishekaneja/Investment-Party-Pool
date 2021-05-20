//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NormalCoin is ERC20 {
    constructor() ERC20("NormalCoin", "NLC") {
        _mint(_msgSender(), 10000 ether);
    }
}
