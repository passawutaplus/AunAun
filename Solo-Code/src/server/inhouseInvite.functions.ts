import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  acceptInhouseInviteWithNotify,
  AcceptInhouseInviteSchema,
  createInhouseInviteWithNotify,
  CreateInhouseInviteSchema,
} from "@/server/inhouseInvite.server";

export const createInhouseInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInhouseInviteSchema.parse(data))
  .handler(async ({ context, data }) => {
    return createInhouseInviteWithNotify({
      orgId: data.orgId,
      invitedBy: context.userId,
      role: data.role,
      email: data.email || undefined,
      workspaceIds: data.workspaceIds,
    });
  });

export const acceptInhouseInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AcceptInhouseInviteSchema.parse(data))
  .handler(async ({ context, data }) => {
    return acceptInhouseInviteWithNotify(
      data.token,
      context.userId,
      context.supabase as unknown as {
        rpc: (
          fn: string,
          args: Record<string, string>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      },
    );
  });
