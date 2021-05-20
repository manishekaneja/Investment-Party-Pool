//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {NormalCoin} from "./NormalCoin.sol";

contract Party is Ownable {
    address public token; //Tells Token being used for this party
    mapping(address => uint256) public investment; //Tracks the party members and their investment ammount
    address public claimedBy; //Remembers who claimed the funds
    uint256 private expireTime = block.timestamp + 7 days; //Sets expiry time of the party
    address[] public prt;
    function get() external view returns (uint){
        return investment[msg.sender];
    }
     function get2() external view returns (address[] memory){
        return prt;
    }
    constructor(address tokenAddress) {
        token = tokenAddress;
        claimedBy = address(0);
        expireTime = block.timestamp + 7 days ;
    }

    modifier isExpired() {
        require(expireTime <= block.timestamp, "Party Not Expired yet");
        _;
    }

    modifier unclaimed() {
        require(claimedBy == address(0), "Party is unclaimed yet");
        _;
    }

    modifier claimed() {
        require(claimedBy != address(0), "Party Funds Already Claimed");
        _;
    }

    modifier onlyInvester(address invester) {
        require(investment[invester] > 0, "Not Invested");
        _;
    }

    modifier isAllowedToInvest(address invester) {
        require(
            invester != address(0) &&
                invester != owner() &&
                expireTime> block.timestamp,
            "Invalid Investment"
        );
        _;
    }

    function invest(address invester, uint256 amount)
        external
        onlyOwner
        isAllowedToInvest(invester)
        unclaimed
    {
        require(amount > 0, "Invalid Investment");
        IERC20(token).transferFrom(invester, address(this), amount);
        investment[invester] += amount;
    }

    function claim(address invester)
        external
        onlyOwner
        isExpired
        unclaimed
        onlyInvester(invester)
        returns (bool)
    {
        claimedBy = invester;
        uint256 totalFunds = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(invester, totalFunds);
        return true;
    }

    function checkInvestedAmount(address invester)
        external
        view
        returns (uint256)
    {
        return investment[invester];
    }

    function getPartyFunds() external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}

