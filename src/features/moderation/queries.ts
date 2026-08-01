import { queryOptions } from "@tanstack/react-query";

import { listMyBlockedIds, listMyBlocks } from "./block.functions";
import {
  getMyModerationRole,
  listModerationLog,
  listReports,
  searchMembers,
} from "./moderation.functions";
import { listMyReports } from "./report.functions";
import type { ReportStatus } from "./types";

export const myModerationRoleQuery = () =>
  queryOptions({
    queryKey: ["moderation", "role"],
    queryFn: () => getMyModerationRole(),
  });

export const myBlocksQuery = () =>
  queryOptions({
    queryKey: ["moderation", "blocks"],
    queryFn: () => listMyBlocks(),
  });

export const myBlockedIdsQuery = () =>
  queryOptions({
    queryKey: ["moderation", "blocked-ids"],
    queryFn: () => listMyBlockedIds(),
  });

export const myReportsQuery = () =>
  queryOptions({
    queryKey: ["moderation", "my-reports"],
    queryFn: () => listMyReports(),
  });

export const reportQueueQuery = (status: ReportStatus) =>
  queryOptions({
    queryKey: ["moderation", "queue", status],
    queryFn: () => listReports({ data: { status } }),
  });

export const moderationLogQuery = () =>
  queryOptions({
    queryKey: ["moderation", "log"],
    queryFn: () => listModerationLog(),
  });

export const memberSearchQuery = (query: string) =>
  queryOptions({
    queryKey: ["moderation", "members", query],
    queryFn: () => searchMembers({ data: { query } }),
  });
