import { queryOptions } from "@tanstack/react-query";

import { getMyPost, listMyPosts } from "./post.functions";

export const myPostsQuery = () =>
  queryOptions({
    queryKey: ["my-posts"],
    queryFn: () => listMyPosts(),
  });

export const myPostQuery = (postId: string) =>
  queryOptions({
    queryKey: ["my-posts", postId],
    queryFn: () => getMyPost({ data: { postId } }),
  });
