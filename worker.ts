// @ts-expect-error OpenNext generates this file before Wrangler deploys the worker.
import openNextWorker from "./.open-next/worker.js";
import { runDailyDigestForPreviousShanghaiDay } from "./lib/daily-digest";

const worker: ExportedHandler<CloudflareEnv> = {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (controller.cron !== "0 1 * * *") return;
    ctx.waitUntil(
      runDailyDigestForPreviousShanghaiDay({ env }).then((result) => {
        console.log("Daily digest cron finished", result);
      }),
    );
  },
};

export default worker;
