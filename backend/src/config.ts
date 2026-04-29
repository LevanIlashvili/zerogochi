function opt(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function need(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key}`);
  return v;
}

/// Mainnet by default. The relayer wallet must hold OG to pay gas.
export const config = {
  port: Number(opt('PORT', '8787')),

  // Chain
  rpcUrl: opt('RPC_URL', 'https://evmrpc.0g.ai'),
  chainId: Number(opt('CHAIN_ID', '16661')),
  explorerUrl: opt('EXPLORER_URL', 'https://chainscan.0g.ai'),

  // Contracts (filled in by deploy)
  zerogochi: opt('ZEROGOCHI_ADDRESS', ''),
  forwarder: opt('FORWARDER_ADDRESS', ''),

  // Relayer
  relayerPk: opt('RELAYER_PK', ''),

  // Telegram
  tgBotToken: opt('TG_BOT_TOKEN', ''),
  miniAppUrl: opt('MINI_APP_URL', 'http://localhost:3737'),

  // 0G Storage / Compute (mainnet)
  storageIndexerUrl: opt('STORAGE_INDEXER_URL', 'https://indexer-storage-turbo.0g.ai'),
  /// Provider address for the inference model — fetched dynamically at boot
  /// from broker.inference.listService(). DeepSeek on mainnet.
  inferenceModel: opt('INFERENCE_MODEL', 'deepseek-chat'),
};

export function assertProductionConfig() {
  need('RELAYER_PK');
  need('TG_BOT_TOKEN');
  need('ZEROGOCHI_ADDRESS');
  need('FORWARDER_ADDRESS');
}
