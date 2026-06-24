import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiControlCenterSection } from "./AiControlCenterSection";
import { PriceGuideSection } from "./PriceGuideSection";
import { HqSection } from "./HqSection";

export function AiHubSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">AI Center</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          จัดการระบบ AI ของ So1o — Control Center, Price Guide และ HQ Agents
        </p>
      </div>
      <Tabs defaultValue="control" className="w-full">
        <TabsList>
          <TabsTrigger value="control">AI Control</TabsTrigger>
          <TabsTrigger value="price">Price Guide</TabsTrigger>
          <TabsTrigger value="hq">So1o HQ</TabsTrigger>
        </TabsList>
        <TabsContent value="control" className="mt-4">
          <AiControlCenterSection />
        </TabsContent>
        <TabsContent value="price" className="mt-4">
          <PriceGuideSection />
        </TabsContent>
        <TabsContent value="hq" className="mt-4">
          <HqSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
