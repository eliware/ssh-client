export function claimTransferSettlement(state) {
  if (state.settled) return false;
  state.settled = true;
  return true;
}
