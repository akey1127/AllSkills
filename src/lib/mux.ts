import Mux from "@mux/mux-node";

export function getMux(options?: { webhook?: boolean }): Mux {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET");
  }
  const webhookSecret =
    options?.webhook === true ? process.env.MUX_WEBHOOK_SECRET : undefined;
  if (options?.webhook && !webhookSecret) {
    throw new Error("Missing MUX_WEBHOOK_SECRET");
  }
  return new Mux({
    tokenId,
    tokenSecret,
    ...(webhookSecret ? { webhookSecret } : {}),
  });
}
