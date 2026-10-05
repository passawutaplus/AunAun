import { seederBatch } from "./batch";
import { opsDailyReport, opsLinkHealth, opsRetention } from "./ops";
import { seederScheduler } from "./scheduler";

export const functions = [seederBatch, seederScheduler, opsDailyReport, opsLinkHealth, opsRetention];
