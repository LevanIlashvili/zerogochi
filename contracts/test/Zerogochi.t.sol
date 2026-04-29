// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC2771Forwarder} from "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import {Zerogochi} from "../src/Zerogochi.sol";
import {MockVerifier} from "../src/MockVerifier.sol";
import {Forwarder} from "../src/Forwarder.sol";
import {AgentNFT} from "../src/erc7857/AgentNFT.sol";

contract ZerogochiTest is Test {
    Zerogochi pet;
    MockVerifier verifier;
    Forwarder forwarder;
    address alice;
    address bob = address(0xB0B);
    address relayer = address(0xCAFE);
    uint256 alicePk = 0xA11CE;

    function setUp() public {
        alice = vm.addr(alicePk);
        vm.deal(relayer, 10 ether);

        forwarder = new Forwarder();
        verifier = new MockVerifier();
        Zerogochi impl = new Zerogochi(address(forwarder));
        bytes memory initData = abi.encodeCall(
            AgentNFT.initialize,
            (
                "Zerogochi",
                "ZGO",
                address(verifier),
                "https://evmrpc.0g.ai",
                "https://indexer-storage-turbo.0g.ai"
            )
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        pet = Zerogochi(address(proxy));
    }

    function _proofs(bytes32 hash_) internal pure returns (bytes[] memory ps) {
        ps = new bytes[](1);
        ps[0] = abi.encodePacked(hash_);
    }

    function _descriptions() internal pure returns (string[] memory ds) {
        ds = new string[](1);
        ds[0] = "personality.json";
    }

    function _mintFor(address who) internal returns (uint256 tokenId) {
        vm.prank(who);
        tokenId = pet.mintPet(_proofs(bytes32("hash1")), _descriptions(), uint8(42), 1, 1, 1);
    }

    function test_mint_emits_born_and_records_pet() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit Zerogochi.Born(0, alice, uint64(block.timestamp), uint8(42));
        uint256 id = pet.mintPet(_proofs(bytes32("hash1")), _descriptions(), uint8(42), 1, 1, 1);

        assertEq(id, 0);
        assertEq(pet.ownerOf(0), alice);
        (uint256 ownedId, bool exists) = pet.petOf(alice);
        assertEq(ownedId, 0);
        assertEq(exists, true);

        (uint256 noneId, bool noneExists) = pet.petOf(bob);
        assertEq(noneId, 0);
        assertEq(noneExists, false);
    }

    function test_token_uri_returns_personality_pointer() public {
        uint256 id = _mintFor(alice);
        string memory uri = pet.tokenURI(id);
        assertEq(
            uri,
            "0g://0x6861736831000000000000000000000000000000000000000000000000000000"
        );
    }

    function test_mint_one_per_address() public {
        _mintFor(alice);
        vm.prank(alice);
        vm.expectRevert(Zerogochi.AlreadyHasPet.selector);
        pet.mintPet(_proofs(bytes32("h2")), _descriptions(), 0, 1, 1, 1);
    }

    function test_mint_invalid_decay() public {
        vm.prank(alice);
        vm.expectRevert(Zerogochi.InvalidDecay.selector);
        pet.mintPet(_proofs(bytes32("h")), _descriptions(), 0, 0, 1, 1);

        vm.prank(alice);
        vm.expectRevert(Zerogochi.InvalidDecay.selector);
        pet.mintPet(_proofs(bytes32("h")), _descriptions(), 0, 1, 6, 1);
    }

    function test_stats_full_at_birth() public {
        uint256 id = _mintFor(alice);
        (uint8 h, uint8 m, uint8 e, bool dead) = pet.statsOf(id);
        assertEq(h, 100);
        assertEq(m, 100);
        assertEq(e, 100);
        assertEq(dead, false);
    }

    function test_decay_one_per_hour() public {
        uint256 id = _mintFor(alice);
        vm.warp(block.timestamp + 10 hours);
        (uint8 h, uint8 m, uint8 e, ) = pet.statsOf(id);
        assertEq(h, 90);
        assertEq(m, 90);
        assertEq(e, 90);
    }

    function test_feed_resets_hunger_only() public {
        uint256 id = _mintFor(alice);
        vm.warp(block.timestamp + 30 hours);
        vm.prank(alice);
        pet.feed(id);
        (uint8 h, uint8 m, , ) = pet.statsOf(id);
        assertEq(h, 100);
        assertEq(m, 70);
    }

    function test_play_resets_mood_and_energy() public {
        uint256 id = _mintFor(alice);
        vm.warp(block.timestamp + 20 hours);
        vm.prank(alice);
        pet.play(id);
        (uint8 h, uint8 m, uint8 e, ) = pet.statsOf(id);
        assertEq(h, 80);
        assertEq(m, 100);
        assertEq(e, 100);
    }

    function test_only_owner_can_feed() public {
        uint256 id = _mintFor(alice);
        vm.prank(bob);
        vm.expectRevert(Zerogochi.NotOwner.selector);
        pet.feed(id);
    }

    function test_starvation_after_long_neglect() public {
        uint256 id = _mintFor(alice);
        vm.warp(block.timestamp + 124 hours);
        (, , , bool dead) = pet.statsOf(id);
        assertEq(dead, true);
    }

    function test_starvation_emits_died_on_next_action() public {
        uint256 id = _mintFor(alice);
        vm.warp(block.timestamp + 130 hours);
        vm.prank(alice);
        vm.expectEmit(true, false, false, false);
        emit Zerogochi.Died(id, uint64(block.timestamp));
        vm.expectRevert(Zerogochi.PetIsDead.selector);
        pet.feed(id);
    }

    function test_log_spoke_emits_event() public {
        uint256 id = _mintFor(alice);
        bytes32 dlgHash = keccak256("hi pet");
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Zerogochi.Spoke(id, uint64(block.timestamp), dlgHash);
        pet.logSpoke(id, dlgHash);
    }

    function test_data_hashes_round_trip() public {
        bytes32 personality = keccak256("anxious dramatic loyal");
        vm.prank(alice);
        uint256 id = pet.mintPet(_proofs(personality), _descriptions(), uint8(99), 2, 2, 2);

        bytes32[] memory hashes = pet.dataHashesOf(id);
        assertEq(hashes.length, 1);
        assertEq(hashes[0], personality);
    }

    /// Mint via the relayer using ERC-2771 forwarder. Alice signs an EIP-712
    /// ForwardRequest with her CloudStorage key; relayer broadcasts and pays
    /// gas; Zerogochi sees alice as _msgSender, so the pet is minted to her.
    function test_meta_tx_mint_attributes_to_signer() public {
        bytes memory data = abi.encodeCall(
            Zerogochi.mintPet,
            (_proofs(bytes32("metaP")), _descriptions(), uint8(7), 2, 2, 2)
        );

        ERC2771Forwarder.ForwardRequestData memory req = _buildRequest(alice, address(pet), data);
        req.signature = _signRequest(alicePk, req);

        vm.prank(relayer);
        forwarder.execute(req);

        // Pet should be alice's, not the relayer's
        assertEq(pet.ownerOf(0), alice);
        (uint256 tokenId, bool exists) = pet.petOf(alice);
        assertEq(tokenId, 0);
        assertEq(exists, true);
        (uint256 noneId, bool noneExists) = pet.petOf(relayer);
        assertEq(noneId, 0);
        assertEq(noneExists, false);
    }

    function _buildRequest(address from, address to, bytes memory data)
        internal
        view
        returns (ERC2771Forwarder.ForwardRequestData memory)
    {
        return ERC2771Forwarder.ForwardRequestData({
            from: from,
            to: to,
            value: 0,
            gas: 1_500_000,
            deadline: uint48(block.timestamp + 1 hours),
            data: data,
            signature: bytes("")
        });
    }

    function _signRequest(uint256 pk, ERC2771Forwarder.ForwardRequestData memory req)
        internal
        view
        returns (bytes memory)
    {
        bytes32 typeHash = keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"
        );
        bytes32 structHash = keccak256(
            abi.encode(
                typeHash,
                req.from,
                req.to,
                req.value,
                req.gas,
                forwarder.nonces(req.from),
                req.deadline,
                keccak256(req.data)
            )
        );

        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            ,

        ) = forwarder.eip712Domain();
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}
