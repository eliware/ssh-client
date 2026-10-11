export function createOperationQueue() {
  let queue = Promise.resolve();
  return (operation) => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  };
}
