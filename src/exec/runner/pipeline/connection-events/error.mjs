import { connectionError } from "../../../connection/errors.mjs";

export function createTransportErrorHandler({ finish, isEnded, isSettled }) {
  return (error) => {
    if (!isEnded() && !isSettled()) finish(connectionError(error));
  };
}
