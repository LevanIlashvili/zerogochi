// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Zerogochi} from "../src/Zerogochi.sol";

/// @notice Pre-stages a demo pet with rich history so the recording has
///         something to show. Only useful on a local anvil fork (it warps
///         time to fabricate event history).
///
///         usage:
///           anvil --fork-url https://evmrpc.0g.ai --auto-impersonate
///           DEPLOYER_PK=0x... ZEROGOCHI=0x... DEMO_OWNER=0x... \
///             forge script script/Seed.s.sol --rpc-url http://localhost:8545 --broadcast
contract Seed is Script {
    function run() external {
        address zgo = vm.envAddress("ZEROGOCHI");
        address owner = vm.envAddress("DEMO_OWNER");
        Zerogochi pet = Zerogochi(zgo);

        bytes[] memory proofs = new bytes[](1);
        proofs[0] = abi.encodePacked(keccak256("demo-personality"));
        string[] memory descs = new string[](1);
        descs[0] = "personality.json";

        vm.startBroadcast(owner);
        uint256 tokenId = pet.mintPet(proofs, descs, uint8(142), 1, 1, 1);

        // Warp 1 day, feed
        skip(86_400);
        pet.feed(tokenId);

        // Warp 1 day, no feed (start of pain)
        skip(86_400);

        // Warp 1 day, owner feeds late
        skip(86_400);
        pet.feed(tokenId);

        // Warp 1 day, no feed
        skip(86_400);

        // Warp 1 day - now 5d old, low stats
        skip(86_400);
        vm.stopBroadcast();

        (uint8 h, uint8 m, uint8 e, bool dead) = pet.statsOf(tokenId);
        console.log("Demo pet seeded:");
        console.log("  tokenId: ", tokenId);
        console.log("  hunger:  ", h);
        console.log("  mood:    ", m);
        console.log("  energy:  ", e);
        console.log("  dead:    ", dead ? 1 : 0);
    }

    function skip(uint256 seconds_) internal {
        vm.warp(block.timestamp + seconds_);
        vm.roll(block.number + seconds_ / 12);
    }
}
