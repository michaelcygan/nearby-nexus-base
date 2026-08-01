import { queryOptions } from "@tanstack/react-query";

import {
  getMyProfile,
  getPublicProfile,
  listMySavedNeighborhoods,
} from "./profile.functions";

export const myProfileQuery = () =>
  queryOptions({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
  });

export const publicProfileQuery = (profileId: string) =>
  queryOptions({
    queryKey: ["profile", profileId],
    queryFn: () => getPublicProfile({ data: { profileId } }),
  });

export const mySavedNeighborhoodsQuery = () =>
  queryOptions({
    queryKey: ["my-saved-neighborhoods"],
    queryFn: () => listMySavedNeighborhoods(),
  });
