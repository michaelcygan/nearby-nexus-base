import { queryOptions } from "@tanstack/react-query";

import { listAccessPoints, listCommunitiesForAdmin } from "./access-points.functions";

export const accessPointsQuery = () =>
  queryOptions({
    queryKey: ["access-points"],
    queryFn: () => listAccessPoints(),
  });

export const adminCommunitiesQuery = () =>
  queryOptions({
    queryKey: ["admin-communities"],
    queryFn: () => listCommunitiesForAdmin(),
  });
