import { ExtensionMessage, ExtensionResponse } from "./types/messages";

export function sendMessage(msg: ExtensionMessage): Promise<ExtensionResponse> {
  return browser.runtime.sendMessage(msg);
}
