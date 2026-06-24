import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FEATURE_GROUPS } from "@/data/landingContent";
import { LANDING_MOCKUPS } from "@/data/landingAssets";
import { FadeUp } from "@/components/motion/FadeUp";
import { BrowserFrame, MockupImage } from "@/components/landing/BrowserFrame";
import { carouselSlideTransition, carouselSlideVariants } from "@/lib/motion";

const MOCK_BY_GROUP = {
  jobs: LANDING_MOCKUPS.features.jobs,
  manage: LANDING_MOCKUPS.features.manage,
  finance: LANDING_MOCKUPS.features.finance,
} as const;

export function LandingFeaturesTabs() {
  const [tab, setTab] = React.useState<string>("jobs");

  return (
    <section
      id="features"
      className="mx-auto max-w-6xl px-4 py-14 sm:py-20 bg-muted/25 rounded-3xl my-4 sm:my-6"
    >
      <FadeUp className="text-center max-w-2xl mx-auto mb-8">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
          ฟีเจอร์ที่ครบทุกมุมการทำงาน
        </h3>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          ออกแบบมาเพื่อฟรีแลนซ์โดยเฉพาะ ตั้งแต่รับงาน บริหาร ไปจนถึงเก็บเงินและยื่นภาษี
        </p>
      </FadeUp>

      <FadeUp delay={0.06}>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            {FEATURE_GROUPS.map((g) => (
              <TabsTrigger key={g.id} value={g.id} className="text-xs sm:text-sm">
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {FEATURE_GROUPS.map((g) => {
            const mock = MOCK_BY_GROUP[g.id as keyof typeof MOCK_BY_GROUP];
            return (
              <TabsContent key={g.id} value={g.id} className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <motion.ul
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-4 order-2 lg:order-1"
                  >
                    {g.items.map((item) => (
                      <li key={item.title} className="flex gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">{item.title}</h4>
                          <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                  <div className="order-1 lg:order-2">
                    <BrowserFrame label={`solofreelancer.com — ${g.label}`}>
                      <div className="relative aspect-[800/520] overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={mock.src}
                            className="absolute inset-0"
                            variants={carouselSlideVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={carouselSlideTransition}
                          >
                            <MockupImage
                              src={mock.src}
                              alt={mock.alt}
                              className="h-full w-full object-cover object-top"
                            />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </BrowserFrame>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </FadeUp>
    </section>
  );
}
