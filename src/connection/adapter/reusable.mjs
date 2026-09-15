export function createReusableClientAdapter(client) {
  return {
    on(...args) { client.on(...args); return this; },
    removeListener(...args) { client.removeListener?.(...args); return this; },
    once(...args) { client.once(...args); return this; },
    emit(...args) { client.emit?.(...args); return this; },
    connect() { client.emit?.('ready'); },
    end() { try { client.end(); } catch { client.destroy?.(); } },
    destroy() { client.destroy?.(); },
    exec(...args) { return client.exec(...args); },
    sftp(...args) { return client.sftp(...args); },
  };
}
