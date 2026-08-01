import { queryOptions } from "@tanstack/react-query";

import {
  getMyParticipation,
  listMyParticipation,
  listPostParticipants,
} from "./participation.functions";

export const myParticipationForPostQuery = (postId: string) =>
  queryOptions({
    queryKey: ["participation", "mine", postId],
    queryFn: () => getMyParticipation({ data: { postId } }),
  });

export const myParticipationQuery = () =>
  queryOptions({
    queryKey: ["participation", "mine", "all"],
    queryFn: () => listMyParticipation(),
  });

export const postParticipantsQuery = (postId: string) =>
  queryOptions({
    queryKey: ["participation", "participants", postId],
    queryFn: () => listPostParticipants({ data: { postId } }),
  });
