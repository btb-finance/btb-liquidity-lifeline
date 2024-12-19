// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INonfungiblePositionManager {
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

    function positions(uint256 tokenId) external view returns (Position memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract BTBFinanceFull is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct StakedPosition {
        address owner;
        uint256 tokenId;            
        bool staked;
        
        // For IL calculation - store initial amounts of token0 and token1 at stake time.
        uint256 initialToken0Amount;
        uint256 initialToken1Amount;

        // Track fees earned (in some common unit, say "ETH-equivalent") - simplified.
        uint256 feesAccumulated;

        // When the user unstakes, we will calculate IL and possibly give refunds.
    }

    struct PairVotes {
        uint256 totalVotes; // total votes for this pair in the current cycle
        mapping(address => uint256) userVotes; // track user votes
    }

    // BTB token
    IERC20 public btbToken;
    
    // Uniswap position manager
    INonfungiblePositionManager public positionManager;

    // Fee distribution parameters
    uint256 public constant LP_SHARE = 80;      // 80% to LP
    uint256 public constant VOTER_SHARE = 10;   // 10% to voters
    uint256 public constant TREASURY_SHARE = 10;// 10% to treasury

    address public treasury;
    address public voterRewardPool;

    // Track staked positions by tokenId
    mapping(uint256 => StakedPosition) public stakedPositions;

    // Voting and refund allocation
    bytes32[] public pairs; // list of pairs
    mapping(bytes32 => PairVotes) public pairVotes; // votes per pair for the current week
    uint256 public votingStart;
    uint256 public votingEnd;
    bool public votingActive;
    uint256 public weeklyRefundBudget;

    // Events
    event PositionStaked(address indexed owner, uint256 tokenId, uint256 initialToken0, uint256 initialToken1);
    event FeesUpdated(uint256 tokenId, uint256 feesEarned);
    event FeesDistributed(address indexed lp, uint256 lpAmount, address indexed voters, uint256 voterAmount, address indexed treasury, uint256 treasuryAmount);
    event ILRefunded(address indexed lp, uint256 tokenId, uint256 btbAmount);
    event UnstakedPosition(address indexed lp, uint256 tokenId);
    event Voted(address indexed voter, bytes32 pairId, uint256 amount);
    event VotesWithdrawn(address indexed voter, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _btbToken,
        address _treasury,
        address _voterRewardPool,
        address _positionManager
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        btbToken = IERC20(_btbToken);
        treasury = _treasury;
        voterRewardPool = _voterRewardPool;
        positionManager = INonfungiblePositionManager(_positionManager);
    }

    function stakePosition(uint256 tokenId, uint256 initialToken0Amount, uint256 initialToken1Amount) external {
        positionManager.safeTransferFrom(msg.sender, address(this), tokenId);

        StakedPosition storage pos = stakedPositions[tokenId];
        require(!pos.staked, "Already staked");
        
        pos.owner = msg.sender;
        pos.tokenId = tokenId;
        pos.initialToken0Amount = initialToken0Amount;
        pos.initialToken1Amount = initialToken1Amount;
        pos.staked = true;
        pos.feesAccumulated = 0; // no fees yet at start

        emit PositionStaked(msg.sender, tokenId, initialToken0Amount, initialToken1Amount);
    }

    // VOTING

    function addPair(bytes32 pairId) external onlyOwner {
        require(!validPair(pairId), "Pair already exists");
        pairs.push(pairId);
    }

    function startWeek(uint256 weekDuration, uint256 refundBudget) external onlyOwner {
        require(!votingActive, "Voting already active");
        require(btbToken.transferFrom(msg.sender, address(this), refundBudget), "BTB transfer failed");
        
        votingActive = true;
        votingStart = block.timestamp;
        votingEnd = block.timestamp + weekDuration;
        weeklyRefundBudget = refundBudget;

        // Reset votes for all pairs
        for (uint i=0; i<pairs.length; i++) {
            delete pairVotes[pairs[i]].totalVotes;
        }
    }

    function endWeek() external {
        require(votingActive, "Voting not active");
        require(block.timestamp > votingEnd, "Voting not ended yet");
        votingActive = false;
    }

    function voteForPair(bytes32 pairId, uint256 btbAmount) external {
        require(votingActive, "Voting not active");
        require(block.timestamp <= votingEnd, "Voting ended");
        require(validPair(pairId), "Invalid pair");

        require(btbToken.transferFrom(msg.sender, address(this), btbAmount), "BTB transfer failed");

        pairVotes[pairId].userVotes[msg.sender] += btbAmount;
        pairVotes[pairId].totalVotes += btbAmount;

        emit Voted(msg.sender, pairId, btbAmount);
    }

    function withdrawVotes() external {
        require(!votingActive, "Voting still active");
        uint256 totalUserVotes = 0;
        for (uint i=0; i<pairs.length; i++){
            bytes32 p = pairs[i];
            uint256 userVote = pairVotes[p].userVotes[msg.sender];
            if (userVote > 0) {
                totalUserVotes += userVote;
                delete pairVotes[p].userVotes[msg.sender];
            }
        }
        require(totalUserVotes > 0, "No votes to withdraw");
        require(btbToken.transfer(msg.sender, totalUserVotes), "BTB transfer failed");
        emit VotesWithdrawn(msg.sender, totalUserVotes);
    }

    // HELPERS

    function validPair(bytes32 pairId) public view returns (bool) {
        for (uint i=0; i<pairs.length; i++) {
            if (pairs[i] == pairId) return true;
        }
        return false;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}