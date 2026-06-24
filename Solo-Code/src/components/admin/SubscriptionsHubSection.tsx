import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentSection } from "./ContentSection";
import { TopSubscriptionsSection } from "./TopSubscriptionsSection";
import type { AdminMetrics } from "./useAdminMetrics";

export function SubscriptionsHubSection({ m }: { m: AdminMetrics }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
          Subscriptions & ค่าใช้จ่าย
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          ภาพรวมค่าใช้จ่ายของระบบ และ subscription ยอดนิยมที่ user สมัคร
        </p>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Subs & Expenses</TabsTrigger>
          <TabsTrigger value="top">Top Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <ContentSection m={m} />
        </TabsContent>
        <TabsContent value="top" className="mt-4">
          <TopSubscriptionsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
