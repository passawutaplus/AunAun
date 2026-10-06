import { seederBatch } from "./batch";
import { creatorSubmissions } from "./creator";
import { opsDailyReport, opsLinkHealth, opsRetention } from "./ops";
import { seederScheduler } from "./scheduler";

export const functions = [seederBatch, seederScheduler, creatorSubmissions, opsDailyReport, opsLinkHealth, opsRetention];
