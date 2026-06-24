import * as React from "react";
import { meetingReportMarkdownToHtml } from "@/lib/meetingReportMarkdown";

export type MeetingCaptureRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string | null;
  source_type: string;
  duration_sec: number | null;
  status: string;
  transcript: string | null;
  report_markdown: string | null;
  extract_result: Record<string, unknown> | null;
  brief_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export function MeetingReportPdfTemplate({
  title,
  reportMarkdown,
  createdAt,
  durationSec,
}: {
  title: string;
  reportMarkdown: string;
  createdAt: string;
  durationSec?: number | null;
}) {
  const dateStr = new Date(createdAt).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dur =
    durationSec && durationSec > 0
      ? `${Math.floor(durationSec / 60)} นาที`
      : undefined;

  return (
    <div className="meeting-report-pdf-root">
      <header className="meeting-report-pdf-header">
        <p className="meeting-report-pdf-kicker">So1o · Meeting Report</p>
        <h1 className="meeting-report-pdf-title">{title || "สรุปการประชุม"}</h1>
        <p className="meeting-report-pdf-meta">
          {dateStr}
          {dur ? ` · ${dur}` : ""}
        </p>
      </header>
      <article
        className="meeting-report-pdf-body"
        dangerouslySetInnerHTML={{ __html: meetingReportMarkdownToHtml(reportMarkdown) }}
      />
    </div>
  );
}
