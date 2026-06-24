export interface CommentNode<T extends { id: string; parent_id?: string | null; depth?: number }> {
  comment: T;
  replies: CommentNode<T>[];
}

export function buildCommentTree<T extends { id: string; parent_id?: string | null }>(
  flat: T[],
): CommentNode<T>[] {
  const byId = new Map<string, CommentNode<T>>();
  const roots: CommentNode<T>[] = [];

  for (const c of flat) {
    byId.set(c.id, { comment: c, replies: [] });
  }

  for (const c of flat) {
    const node = byId.get(c.id)!;
    const parentId = c.parent_id ?? null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: CommentNode<T>[]) => {
    nodes.sort(
      (a, b) =>
        new Date((a.comment as { created_at?: string }).created_at ?? 0).getTime() -
        new Date((b.comment as { created_at?: string }).created_at ?? 0).getTime(),
    );
    nodes.forEach((n) => sortNodes(n.replies));
  };
  sortNodes(roots);
  return roots;
}

export function countThread(nodes: CommentNode<unknown>[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countThread(n.replies as CommentNode<unknown>[]), 0);
}
