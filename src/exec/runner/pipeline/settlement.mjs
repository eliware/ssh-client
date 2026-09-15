export function claimSettlement(state) {
  if (state.value) return false;
  state.value = true;
  return true;
}
