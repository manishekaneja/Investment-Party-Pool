//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Party} from "./Party.sol";

contract PartyPool is Ownable {
    mapping(address => bool) private isAllowed; //To track the approved coins
    address[] private partyList; //Invested In Which Pool

    modifier isAllowedToken(address token) {
        require(isAllowed[token] == true, "Token Not Approved");
        _;
    }

    function approveToken(address token) external onlyOwner {
        isAllowed[token] = true;
    }

    function startParty(address token) external isAllowedToken(token) {
        address partyContract = address(new Party(token));
        partyList.push(partyContract);
    }

    function invest(address party, uint256 amount) external {
        Party(party).invest(msg.sender, amount);
    }

    function claim(address party) external {
        Party(party).claim(msg.sender);
    }
    
    function getPartyList() external view returns (address[] memory) {
        return partyList;
    }

    function tokenState(address coinAddress) external view returns (bool) {
        return isAllowed[coinAddress];
    }
}
