import { connect as connectImpl } from "../connection/lifecycle/client/connect.mjs";
import { operationMetadata, runLoggedOperation } from "../logging/operation.mjs";

export function singleTransfer(operation, options, connect = connectImpl) {
  const config = options ?? {};
  const { logger, ...connectionOptions } = config;
  const metadata = operationMetadata(operation, config);
  return runLoggedOperation(logger, metadata, async () => {
    const connection = await connect(connectionOptions);
    try {
      return await connection[operation](config);
    } finally {
      await connection.close();
    }
  });
}
