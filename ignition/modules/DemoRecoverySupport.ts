import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { maxUint256 } from "viem";
import RecoverySupportModule from "./RecoverySupport.js";

export default buildModule("DemoRecoverySupportModule", (m) => {
  const mockJpyc = m.contract("MockJPYC");
  const { tamagakiSBT, vault, registry, council } = m.useModule(RecoverySupportModule);
  m.call(
    vault,
    "configureAsset",
    [mockJpyc, true, maxUint256, maxUint256, maxUint256],
    { id: "configure_mock_jpyc" },
  );
  return { tamagakiSBT, vault, registry, council, mockJpyc };
});
