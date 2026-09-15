import { claimSettlement } from './settlement.mjs';

export function createFinisher(state, complete) {
  return error => {
    if (!claimSettlement(state)) return;
    complete(error);
  };
}
