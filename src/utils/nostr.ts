import Hex from "crypto-js/enc-hex.js";
import sha256 from "crypto-js/sha256.js";
import { Event, ZapArgs } from '../types';

export async function generateZapEvent({
  satoshi, comment, p, e, relays
}: ZapArgs): Promise<Event> {
  if (!globalThis.nostr) {
    throw new Error("Please use a nostr extension");
  }

  const nostrTags = [
    ["p", p],
    ["relays", ...relays],
    ["amount", satoshi.toString()]
  ]

  if (e) {
    nostrTags.push(["e", e])
  }

  const pubkey = await globalThis.nostr.getPublicKey();

  const nostrEvent: Event = {
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: 9734,
    tags: nostrTags,
    content: comment ?? ""
  }

  nostrEvent.id = getEventHash(nostrEvent)
  return await globalThis.nostr.signEvent(nostrEvent)
}

export function validateEvent(event: Event): boolean {
  if (typeof event.content !== "string") return false;
  if (typeof event.created_at !== "number") return false;
  // ignore these checks because if the pubkey is not set we add it to the event. same for the ID.
  // if (typeof event.pubkey !== "string") return false;
  // if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false;

  if (!Array.isArray(event.tags)) return false;
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    if (!Array.isArray(tag)) return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object") return false;
    }
  }

  return true;
}

export function serializeEvent(evt: Event): string {
  if (!validateEvent(evt))
    throw new Error("can't serialize event with wrong or missing properties");

  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content,
  ]);
}

export function getEventHash(event: Event): string {
  return sha256(serializeEvent(event)).toString(Hex);
}