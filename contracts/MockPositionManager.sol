// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockPositionManager is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => address) public getApproved;
    mapping(uint256 => Position) public positions;

    struct Position {
        uint96 nonce;
        address operator;
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function mint(address to, uint256 tokenId) external {
        ownerOf[tokenId] = to;
        positions[tokenId] = Position(
            0,          // nonce
            address(0), // operator
            address(1), // token0 (mock address)
            address(2), // token1 (mock address)
            3000,       // fee
            -100,       // tickLower
            100,        // tickUpper
            1000,       // liquidity
            0,          // feeGrowthInside0LastX128
            0,          // feeGrowthInside1LastX128
            0,          // tokensOwed0
            0           // tokensOwed1
        );
    }

    function approve(address to, uint256 tokenId) external {
        require(msg.sender == ownerOf[tokenId], "Not owner");
        getApproved[tokenId] = to;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        require(msg.sender == ownerOf[tokenId] || msg.sender == getApproved[tokenId], "Not authorized");
        ownerOf[tokenId] = to;
        getApproved[tokenId] = address(0);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
