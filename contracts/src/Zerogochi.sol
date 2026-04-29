// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentNFT} from "./erc7857/AgentNFT.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Zerogochi
/// @notice ERC-7857 iNFT pet on 0G. Pet state lives in its own ERC-7201
///         namespace alongside AgentNFT's storage so the two never collide.
///         Personality is encrypted in 0G Storage; its dataHash is committed
///         on-chain through AgentNFT's IERC7857DataVerifier.
contract Zerogochi is AgentNFT {
    /// @custom:storage-location erc7201:zerogochi.storage.Pets
    /// @dev `ownerToTokenPlusOne` stores tokenId + 1 so the zero value
    ///      unambiguously means "no pet". AgentNFT's nextTokenId starts
    ///      at 0, so a real tokenId of 0 is valid.
    struct PetStorage {
        mapping(uint256 tokenId => Pet) pets;
        mapping(address owner => uint256 tokenIdPlusOne) ownerToTokenPlusOne;
    }

    struct Pet {
        uint64 bornAt;
        uint64 lastFedAt;
        uint64 lastPlayedAt;
        uint8 hungerDecayRate;
        uint8 moodDecayRate;
        uint8 energyDecayRate;
        uint8 visualSeed;
        bool dead;
    }

    // cast index-erc7201 "zerogochi.storage.Pets"
    bytes32 private constant PET_STORAGE_LOCATION =
        0x38bd266a9973c874e58390b70c93fab028a853d4563f353277780e4851be9c00;

    function _pets() private pure returns (PetStorage storage $) {
        assembly {
            $.slot := PET_STORAGE_LOCATION
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder_) AgentNFT(trustedForwarder_) {}

    event Born(uint256 indexed tokenId, address indexed owner, uint64 at, uint8 visualSeed);
    event Fed(uint256 indexed tokenId, uint64 at);
    event Played(uint256 indexed tokenId, uint64 at);
    event Spoke(uint256 indexed tokenId, uint64 at, bytes32 dialogueHash);
    event Died(uint256 indexed tokenId, uint64 at);

    error AlreadyHasPet();
    error InvalidDecay();
    error NotOwner();
    error PetIsDead();

    /// @notice Mint a pet wrapped around an iNFT. Personality blob's hash
    ///         is committed via AgentNFT.mint's proof array.
    /// @param  proofs            Hash-only proofs (each = abi.encodePacked(bytes32 hash)).
    ///                           For a single-personality pet pass [bytes32(personalityHash)].
    /// @param  dataDescriptions  Parallel array, e.g. ["personality.json"].
    /// @param  visualSeed        uint8 derived client-side from personality vector.
    /// @param  hungerDecayRate   1..5
    /// @param  moodDecayRate     1..5
    /// @param  energyDecayRate   1..5
    function mintPet(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        uint8 visualSeed,
        uint8 hungerDecayRate,
        uint8 moodDecayRate,
        uint8 energyDecayRate
    ) external payable returns (uint256 tokenId) {
        if (
            hungerDecayRate == 0 || hungerDecayRate > 5 ||
            moodDecayRate == 0 || moodDecayRate > 5 ||
            energyDecayRate == 0 || energyDecayRate > 5
        ) revert InvalidDecay();

        PetStorage storage $ = _pets();
        if ($.ownerToTokenPlusOne[_msgSender()] != 0) revert AlreadyHasPet();

        // AgentNFT.mint emits its own event and assigns tokenId; we layer Pet on top.
        tokenId = mint(proofs, dataDescriptions, _msgSender());

        $.pets[tokenId] = Pet({
            bornAt: uint64(block.timestamp),
            lastFedAt: uint64(block.timestamp),
            lastPlayedAt: uint64(block.timestamp),
            hungerDecayRate: hungerDecayRate,
            moodDecayRate: moodDecayRate,
            energyDecayRate: energyDecayRate,
            visualSeed: visualSeed,
            dead: false
        });
        $.ownerToTokenPlusOne[_msgSender()] = tokenId + 1;

        emit Born(tokenId, _msgSender(), uint64(block.timestamp), visualSeed);
    }

    /// @notice Per-token URI override. Upstream returns the same contract
    ///         JSON for every token; we point each token at its own
    ///         personality blob via the dataHash.
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        bytes32[] memory hashes = dataHashesOf(tokenId);
        require(hashes.length > 0, "no data");
        return string.concat("0g://", Strings.toHexString(uint256(hashes[0]), 32));
    }

    /// @notice Token id owned by an address (one pet per address in MVP).
    /// @dev Returns (tokenId, true) if the user has a pet, else (0, false).
    function petOf(address who) external view returns (uint256 tokenId, bool exists) {
        uint256 plusOne = _pets().ownerToTokenPlusOne[who];
        if (plusOne == 0) return (0, false);
        return (plusOne - 1, true);
    }

    /// @notice Compute current stats from time-since-action and per-pet decay
    ///         rates. Stats are never persisted — always derived. The pet
    ///         starves once hunger has been pinned at zero for >24h.
    function statsOf(uint256 tokenId)
        public
        view
        returns (uint8 hunger, uint8 mood, uint8 energy, bool isDead)
    {
        Pet memory p = _pets().pets[tokenId];
        if (p.bornAt == 0) return (0, 0, 0, false);
        if (p.dead) return (0, 0, 0, true);

        uint256 hSinceFed = (block.timestamp - p.lastFedAt) / 1 hours;
        uint256 hSincePlayed = (block.timestamp - p.lastPlayedAt) / 1 hours;

        int256 h = int256(uint256(100)) - int256(hSinceFed * p.hungerDecayRate);
        int256 m = int256(uint256(100)) - int256(hSincePlayed * p.moodDecayRate);
        int256 e = int256(uint256(100)) - int256(hSincePlayed * p.energyDecayRate);

        bool starved =
            h <= 0 &&
            hSinceFed * p.hungerDecayRate >= uint256(100) + uint256(24) * uint256(p.hungerDecayRate);

        hunger = h <= 0 ? 0 : uint8(uint256(h));
        mood = m <= 0 ? 0 : uint8(uint256(m));
        energy = e <= 0 ? 0 : uint8(uint256(e));
        isDead = starved;
    }

    /// @notice Marks a pet dead lazily on the next state-changing call.
    function _checkDeath(uint256 tokenId) internal {
        (, , , bool d) = statsOf(tokenId);
        if (d && !_pets().pets[tokenId].dead) {
            _pets().pets[tokenId].dead = true;
            emit Died(tokenId, uint64(block.timestamp));
        }
    }

    function feed(uint256 tokenId) external {
        if (ownerOf(tokenId) != _msgSender()) revert NotOwner();
        _checkDeath(tokenId);
        if (_pets().pets[tokenId].dead) revert PetIsDead();
        _pets().pets[tokenId].lastFedAt = uint64(block.timestamp);
        emit Fed(tokenId, uint64(block.timestamp));
    }

    function play(uint256 tokenId) external {
        if (ownerOf(tokenId) != _msgSender()) revert NotOwner();
        _checkDeath(tokenId);
        if (_pets().pets[tokenId].dead) revert PetIsDead();
        _pets().pets[tokenId].lastPlayedAt = uint64(block.timestamp);
        emit Played(tokenId, uint64(block.timestamp));
    }

    function logSpoke(uint256 tokenId, bytes32 dialogueHash) external {
        if (ownerOf(tokenId) != _msgSender()) revert NotOwner();
        _checkDeath(tokenId);
        if (_pets().pets[tokenId].dead) revert PetIsDead();
        emit Spoke(tokenId, uint64(block.timestamp), dialogueHash);
    }
}
