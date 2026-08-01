import { queryOptions } from "@tanstack/react-query";

import { getMyAdminStatus, listPlacesForAdmin } from "./place.functions";

export const myAdminStatusQuery = () =>
  queryOptions({
    queryKey: ["my-admin-status"],
    queryFn: () => getMyAdminStatus(),
  });

export const adminPlacesQuery = (neighborhoodId: string) =>
  queryOptions({
    queryKey: ["admin-places", neighborhoodId],
    queryFn: () => listPlacesForAdmin({ data: { neighborhoodId } }),
    enabled: Boolean(neighborhoodId),
  });
