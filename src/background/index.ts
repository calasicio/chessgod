import { EngineManager } from "@/background/engine-manager";
import type {
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types/messages";

const engine = new EngineManager();

browser.runtime.onMessage.addListener(
  (msg: ExtensionMessage, sender): Promise<ExtensionResponse> | undefined => {
    console.info(
      "Message received:",
      msg.type,
      msg,
      "from tab:",
      sender.tab?.id,
    );

    if (msg.type === "ANALYZE") {
      return engine
        .analyze(msg.payload)
        .then((candidates) => ({ type: "ANALYZE_RESULT" as const, candidates }));
    }

    if (msg.type === "NEW_GAME") {
      return engine.newGame().then(() => ({ type: "NEW_GAME_ACK" as const }));
    }

    if (msg.type === "RESTART_ENGINE") {
      return engine.restart().then(() => ({ type: "RESTART_ENGINE_ACK" as const }));
    }

    if (msg.type === "CANCEL_ANALYSIS") {
      engine.stop();
      return Promise.resolve({ type: "CANCEL_ANALYSIS_ACK" as const });
    }

    return undefined;
  },
);
