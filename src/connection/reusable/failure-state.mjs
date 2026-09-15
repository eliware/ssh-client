const CLOSED_ERRORS = new Set(['SSH_COMMAND_TIMEOUT', 'SSH_TIMEOUT', 'SSH_CANCELLED', 'SSH_CONNECTION']);

export function closeOnTransportFailure(state, error) {
  if (CLOSED_ERRORS.has(error?.code)) state.set('closed');
  return error;
}
