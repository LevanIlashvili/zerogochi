// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC2771ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {IERC7857} from "./interfaces/IERC7857.sol";
import {IERC7857Metadata} from "./interfaces/IERC7857Metadata.sol";
import {IERC7857DataVerifier, PreimageProofOutput, TransferValidityProofOutput} from "./interfaces/IERC7857DataVerifier.sol";
import {Utils} from "./Utils.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AgentNFT is
    ERC2771ContextUpgradeable,
    AccessControlEnumerableUpgradeable,
    IERC7857,
    IERC7857Metadata
{
    event Approval(
        address indexed _from,
        address indexed _to,
        uint256 indexed _tokenId
    );
    event ApprovalForAll(
        address indexed _owner,
        address indexed _operator,
        bool _approved
    );

    /// @custom:storage-location erc7201:agent.storage.AgentNFT
    struct AgentNFTStorage {
        // Token data
        mapping(uint256 => TokenData) tokens;
        mapping(address owner => mapping(address operator => bool)) operatorApprovals;
        uint256 nextTokenId;
        // Contract metadata
        string name;
        string symbol;
        string chainURL;
        string indexerURL;
        // Core components
        IERC7857DataVerifier verifier;
    }

    struct TokenData {
        address owner;
        string[] dataDescriptions;
        bytes32[] dataHashes;
        address[] authorizedUsers;
        address approvedUser;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // keccak256(abi.encode(uint(keccak256("agent.storage.AgentNFT")) - 1)) & ~bytes32(uint(0xff))
    bytes32 private constant AGENT_NFT_STORAGE_LOCATION =
        0x4aa80aaafbe0e5fe3fe1aa97f3c1f8c65d61f96ef1aab2b448154f4e07594600;

    function _getAgentStorage()
        private
        pure
        returns (AgentNFTStorage storage $)
    {
        assembly {
            $.slot := AGENT_NFT_STORAGE_LOCATION
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder_) ERC2771ContextUpgradeable(trustedForwarder_) {
        _disableInitializers();
    }

    // ERC-2771 plumbing — both ContextUpgradeable parents need a single override.
    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (uint256)
    {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        address verifierAddr,
        string memory chainURL_,
        string memory indexerURL_
    ) public virtual initializer {
        require(verifierAddr != address(0), "Zero address");

        __AccessControlEnumerable_init();

        // Admin grants intentionally use msg.sender (not _msgSender) so a
        // meta-tx-relayed initialize cannot escalate the relayed user to admin.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        AgentNFTStorage storage $ = _getAgentStorage();
        $.name = name_;
        $.symbol = symbol_;
        $.chainURL = chainURL_;
        $.indexerURL = indexerURL_;
        $.verifier = IERC7857DataVerifier(verifierAddr);
    }

    // Basic getters
    function name() public view virtual returns (string memory) {
        return _getAgentStorage().name;
    }

    function symbol() public view virtual returns (string memory) {
        return _getAgentStorage().symbol;
    }

    function verifier() public view virtual returns (IERC7857DataVerifier) {
        return _getAgentStorage().verifier;
    }

    // Admin functions
    function updateVerifier(
        address newVerifier
    ) public virtual onlyRole(ADMIN_ROLE) {
        require(newVerifier != address(0), "Zero address");
        _getAgentStorage().verifier = IERC7857DataVerifier(newVerifier);
    }

    function updateURLS(
        string memory newChainURL,
        string memory newIndexerURL
    ) public virtual onlyRole(ADMIN_ROLE) {
        AgentNFTStorage storage $ = _getAgentStorage();
        $.chainURL = newChainURL;
        $.indexerURL = newIndexerURL;
    }

    function update(uint256 tokenId, bytes[] calldata proofs) public virtual {
        AgentNFTStorage storage $ = _getAgentStorage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner == _msgSender(), "Not owner");

        PreimageProofOutput[] memory proofOupt = $.verifier.verifyPreimage(
            proofs
        );
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid,
                string(
                    abi.encodePacked(
                        "Invalid preimage proof at index ",
                        i,
                        " with data hash ",
                        proofOupt[i].dataHash
                    )
                )
            );
            newDataHashes[i] = proofOupt[i].dataHash;
        }

        bytes32[] memory oldDataHashes = token.dataHashes;
        token.dataHashes = newDataHashes;

        emit Updated(tokenId, oldDataHashes, newDataHashes);
    }

    function mint(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        address to
    ) public payable virtual returns (uint256 tokenId) {
        AgentNFTStorage storage $ = _getAgentStorage();

        require(
            dataDescriptions.length == proofs.length,
            "Descriptions and proofs length mismatch"
        );

        if (to == address(0)) {
            to = _msgSender();
        }

        PreimageProofOutput[] memory proofOupt = $.verifier.verifyPreimage(
            proofs
        );
        bytes32[] memory dataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid,
                string(
                    abi.encodePacked(
                        "Invalid preimage proof at index ",
                        i,
                        " with data hash ",
                        proofOupt[i].dataHash
                    )
                )
            );
            dataHashes[i] = proofOupt[i].dataHash;
        }

        tokenId = $.nextTokenId++;
        $.tokens[tokenId] = TokenData({
            owner: to,
            dataHashes: dataHashes,
            dataDescriptions: dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        emit Minted(tokenId, _msgSender(), to, dataHashes, dataDescriptions);
    }

    function transfer(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual {
        AgentNFTStorage storage $ = _getAgentStorage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == _msgSender(), "Not owner");

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid &&
                    proofOupt[i].oldDataHash ==
                    $.tokens[tokenId].dataHashes[i] &&
                    proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        $.tokens[tokenId].owner = to;
        $.tokens[tokenId].dataHashes = newDataHashes;

        emit Transferred(tokenId, _msgSender(), to);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual {
        AgentNFTStorage storage $ = _getAgentStorage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == from, "Not owner");
        require(
            $.tokens[tokenId].approvedUser == _msgSender() ||
                $.tokens[tokenId].owner == _msgSender() ||
                $.operatorApprovals[from][_msgSender()],
            "Not approved"
        );

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(proofOupt[i].isValid, "Invalid transfer validity proof");
            require(
                proofOupt[i].newDataHash == $.tokens[tokenId].dataHashes[i],
                string(
                    abi.encodePacked(
                        "New data hash mismatch, hash in proof: ",
                        Strings.toHexString(
                            uint256(proofOupt[i].newDataHash),
                            32
                        ),
                        ", but hash in token: ",
                        Strings.toHexString(
                            uint256($.tokens[tokenId].dataHashes[i]),
                            32
                        )
                    )
                )
            );
            require(
                proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Receiver mismatch, receiver in proof: ",
                        Strings.toHexString(
                            uint256(uint160(proofOupt[i].receiver)),
                            20
                        ),
                        ", but transfer to: ",
                        Strings.toHexString(uint256(uint160(to)), 20)
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        $.tokens[tokenId].owner = to;
        $.tokens[tokenId].dataHashes = newDataHashes;

        emit Transferred(tokenId, _msgSender(), to);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function clone(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual returns (uint256) {
        AgentNFTStorage storage $ = _getAgentStorage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == _msgSender(), "Not owner");

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid &&
                    proofOupt[i].oldDataHash ==
                    $.tokens[tokenId].dataHashes[i] &&
                    proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        uint256 newTokenId = $.nextTokenId++;
        $.tokens[newTokenId] = TokenData({
            owner: to,
            dataHashes: newDataHashes,
            dataDescriptions: $.tokens[tokenId].dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        emit Cloned(tokenId, newTokenId, _msgSender(), to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
        return newTokenId;
    }

    function cloneFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual returns (uint256) {
        AgentNFTStorage storage $ = _getAgentStorage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == from, "Not owner");
        require(
            $.tokens[tokenId].approvedUser == _msgSender() ||
                $.tokens[tokenId].owner == _msgSender() ||
                $.operatorApprovals[from][_msgSender()],
            "Not approved"
        );

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid &&
                    proofOupt[i].oldDataHash ==
                    $.tokens[tokenId].dataHashes[i] &&
                    proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        uint256 newTokenId = $.nextTokenId++;
        $.tokens[newTokenId] = TokenData({
            owner: to,
            dataHashes: newDataHashes,
            dataDescriptions: $.tokens[tokenId].dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        emit Cloned(tokenId, newTokenId, _msgSender(), to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
        return newTokenId;
    }

    function authorizeUsage(uint256 tokenId, address to) public virtual {
        AgentNFTStorage storage $ = _getAgentStorage();
        require($.tokens[tokenId].owner == _msgSender(), "Not owner");
        $.tokens[tokenId].authorizedUsers.push(to);
        emit Authorization(_msgSender(), to, tokenId);
    }

    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        AgentNFTStorage storage $ = _getAgentStorage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.owner;
    }

    function authorizedUsersOf(
        uint256 tokenId
    ) public view virtual returns (address[] memory) {
        AgentNFTStorage storage $ = _getAgentStorage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.authorizedUsers;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual returns (string memory) {
        AgentNFTStorage storage $ = _getAgentStorage();
        require(_exists(tokenId), "Token does not exist");

        return
            string(
                abi.encodePacked(
                    '{"chainURL":"',
                    $.chainURL,
                    '","indexerURL":"',
                    $.indexerURL,
                    '"}'
                )
            );
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _getAgentStorage().tokens[tokenId].owner != address(0);
    }

    function dataHashesOf(
        uint256 tokenId
    ) public view virtual returns (bytes32[] memory) {
        AgentNFTStorage storage $ = _getAgentStorage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.dataHashes;
    }

    function dataDescriptionsOf(
        uint256 tokenId
    ) public view virtual returns (string[] memory) {
        AgentNFTStorage storage $ = _getAgentStorage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.dataDescriptions;
    }

    function approve(address to, uint256 tokenId) public virtual {
        AgentNFTStorage storage $ = _getAgentStorage();
        require($.tokens[tokenId].owner == _msgSender(), "Not owner");
        $.tokens[tokenId].approvedUser = to;
        emit Approval(_msgSender(), to, tokenId);
    }

    function setApprovalForAll(address to, bool approved) public virtual {
        AgentNFTStorage storage $ = _getAgentStorage();
        $.operatorApprovals[_msgSender()][to] = approved;
        emit ApprovalForAll(_msgSender(), to, approved);
    }

    function getApproved(
        uint256 tokenId
    ) public view virtual returns (address operator) {
        AgentNFTStorage storage $ = _getAgentStorage();
        return $.tokens[tokenId].approvedUser;
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) public view virtual returns (bool) {
        AgentNFTStorage storage $ = _getAgentStorage();
        return $.operatorApprovals[owner][operator];
    }

    string public constant VERSION = "1.0.0";
}
