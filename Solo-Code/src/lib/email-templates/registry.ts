import type { ComponentType } from "react";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

import { template as paymentSuccess } from "./payment-success";
import { template as welcomePro } from "./welcome-pro";
import { template as paymentReceipt } from "./payment-receipt";
import { template as subscriptionPastDue } from "./subscription-past-due";
import { template as subscriptionCanceled } from "./subscription-canceled";
import { template as subscriptionScheduledCancel } from "./subscription-scheduled-cancel";
import { template as creditsTopup } from "./credits-topup";
import { template as projectAlert } from "./project-alert";
import { template as quotationPortal } from "./quotation-portal";
import { template as quotationAccepted } from "./quotation-accepted";
import { template as depositReceived } from "./deposit-received";
import { template as paymentFollowup } from "./payment-followup";

export const TEMPLATES: Record<string, TemplateEntry> = {
  "payment-success": paymentSuccess,
  "welcome-pro": welcomePro,
  "payment-receipt": paymentReceipt,
  "subscription-past-due": subscriptionPastDue,
  "subscription-canceled": subscriptionCanceled,
  "subscription-scheduled-cancel": subscriptionScheduledCancel,
  "credits-topup": creditsTopup,
  "project-alert": projectAlert,
  "quotation-portal": quotationPortal,
  "quotation-accepted": quotationAccepted,
  "deposit-received": depositReceived,
  "payment-followup": paymentFollowup,
};
