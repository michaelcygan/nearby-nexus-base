import { queryOptions } from "@tanstack/react-query";

import { listAllStoreListings, listStoreOrders } from "./admin.functions";
import { getStoreListing, getStoreListings, listMyStoreOrders } from "./store.functions";

export const storeListingsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["store", "listings", slug],
    queryFn: () => getStoreListings({ data: { slug } }),
  });

export const storeListingQuery = (listingId: string) =>
  queryOptions({
    queryKey: ["store", "listing", listingId],
    queryFn: () => getStoreListing({ data: { listingId } }),
  });

export const myStoreOrdersQuery = () =>
  queryOptions({
    queryKey: ["store", "my-orders"],
    queryFn: () => listMyStoreOrders(),
  });

export const adminStoreListingsQuery = () =>
  queryOptions({
    queryKey: ["store", "admin", "listings"],
    queryFn: () => listAllStoreListings(),
  });

export const adminStoreOrdersQuery = () =>
  queryOptions({
    queryKey: ["store", "admin", "orders"],
    queryFn: () => listStoreOrders(),
  });
