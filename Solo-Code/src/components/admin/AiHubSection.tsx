import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiControlCenterSection } from "./AiControlCenterSection";
import { PriceGuideSection } from "./PriceGuideSection";

export function AiHubSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">AI Center</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          จัดการระบบ AI ของ So1o — Control Center และ Price Guide
        </p>
      </div>
      <Tabs defaultValue="control" className="w-full">
        <TabsList>
          <TabsTrigger value="control">AI Control</TabsTrigger>
          <TabsTrigger value="price">Price Guide</TabsTrigger>
        </TabsList>
        <TabsContent value="control" className="mt-4">
          <AiControlCenterSection />
        </TabsContent>
        <TabsContent value="price" className="mt-4">
          <PriceGuideSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
