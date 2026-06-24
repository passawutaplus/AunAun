import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthBannerSection } from "./AuthBannerSection";
import { DashboardBannerSection } from "./DashboardBannerSection";

export function BannersHubSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">แบนเนอร์</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          จัดการสไลด์แบนเนอร์ทั้งหน้า Login และ Dashboard ในที่เดียว
        </p>
      </div>
      <Tabs defaultValue="auth" className="w-full">
        <TabsList>
          <TabsTrigger value="auth">หน้า Login</TabsTrigger>
          <TabsTrigger value="dashboard">หน้า Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="auth" className="mt-4">
          <AuthBannerSection />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <DashboardBannerSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
