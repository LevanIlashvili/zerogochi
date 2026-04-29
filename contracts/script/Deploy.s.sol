// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Zerogochi} from "../src/Zerogochi.sol";
import {MockVerifier} from "../src/MockVerifier.sol";
import {Forwarder} from "../src/Forwarder.sol";
import {AgentNFT} from "../src/erc7857/AgentNFT.sol";

/// @notice Deploys the full Zerogochi stack to 0G mainnet (chain id 16661):
///         Forwarder, MockVerifier, Zerogochi implementation, ERC1967 proxy.
///         Writes deployments.json so the backend can pick up addresses.
///
///         usage:
///           DEPLOYER_PK=0x... forge script script/Deploy.s.sol \
///             --rpc-url https://evmrpc.0g.ai --broadcast
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        vm.startBroadcast(pk);

        Forwarder forwarder = new Forwarder();
        MockVerifier verifier = new MockVerifier();
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

        vm.stopBroadcast();

        console.log("Forwarder:       ", address(forwarder));
        console.log("MockVerifier:    ", address(verifier));
        console.log("Zerogochi impl:  ", address(impl));
        console.log("Zerogochi proxy: ", address(proxy));
        console.log("Chain id:        ", block.chainid);

        string memory json = string.concat(
            '{"forwarder":"', vm.toString(address(forwarder)),
            '","verifier":"', vm.toString(address(verifier)),
            '","zerogochiImpl":"', vm.toString(address(impl)),
            '","zerogochi":"', vm.toString(address(proxy)),
            '","chainId":', vm.toString(block.chainid),
            ',"rpcUrl":"https://evmrpc.0g.ai"',
            ',"explorer":"https://chainscan.0g.ai"',
            ',"storageIndexer":"https://indexer-storage-turbo.0g.ai"',
            "}"
        );
        vm.writeFile("./deployments.json", json);
    }
}
