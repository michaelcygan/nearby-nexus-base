import { queryOptions } from "@tanstack/react-query";

import { getThread, listMyThreads } from "./thread.functions";

export const myThreadsQuery = () =>
  queryOptions({
    queryKey: ["threads"],
    queryFn: () => listMyThreads(),
  });

export const threadQuery = (threadId: string) =>
  queryOptions({
    queryKey: ["threads", threadId],
    queryFn: () => getThread({ data: { threadId } }),
  });
