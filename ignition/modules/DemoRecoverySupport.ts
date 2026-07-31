import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import RecoverySupportModule from "./RecoverySupport.js";

export default buildModule("DemoRecoverySupportModule", (m) => {
  const mockJpyc = m.contract("MockJPYC");
  const { tamagakiSBT, vault, registry, council } = m.useModule(RecoverySupportModule);
  m.call(vault, "setAllowedAsset", [mockJpyc, true], { id: "allow_mock_jpyc" });
  return { tamagakiSBT, vault, registry, council, mockJpyc };
});
