import { Graph } from '@api-modeling/graphlib';
import { NodeIdentifier } from '@api-modeling/graphlib/src/types.js';

/**
 * @param {Graph} g
 * @param {NodeIdentifier} v
 * @param {boolean} postOrder
 * @param {Record<NodeIdentifier, boolean>} visited
 * @param {(v: NodeIdentifier) => NodeIdentifier[]} navigation
 * @param {NodeIdentifier[]} acc
 */
function doDfs<G, N, E>(
  g: Graph<G, N, E>,
  v: NodeIdentifier,
  postOrder: boolean,
  visited: Record<NodeIdentifier, boolean>,
  navigation: (f: NodeIdentifier) => NodeIdentifier[] | undefined,
  acc: NodeIdentifier[],
  callback: (x: NodeIdentifier[], graph: Graph<G, N, E>) => boolean
) {
  if (!visited[v]) {
    // eslint-disable-next-line no-param-reassign
    visited[v] = true;

    // if (!postOrder) {
    acc.push(v);
    if (callback(acc, g)) return;
    // }

    navigation(v)?.forEach(w => {
      doDfs(g, w, postOrder, visited, navigation, acc, callback);
    });
    // if (postOrder) {
    // acc.push(v);
    // TODO: FIXME FOR POSTORDER
    // if (callback(v, acc.length)) return;
  }
}

/**
 * A helper that preforms a pre- or post-order traversal on the input graph
 * and returns the nodes in the order they were visited. If the graph is
 * undirected then this algorithm will navigate using neighbors. If the graph
 * is directed then this algorithm will navigate using successors.
 *
 * Order must be one of "pre" or "post".
 *
 * @param {Graph} g
 * @param {NodeIdentifier|NodeIdentifier[]} vs
 * @param {'pre'|'post'} order
 * @returns {NodeIdentifier[]}
 */
export function dfs<G, N, E>(
  g: Graph<G, N, E>,
  vs: NodeIdentifier | NodeIdentifier[],
  order: 'pre' | 'post',
  callback: (accumulator: NodeIdentifier[], gg: Graph<G, N, E>) => boolean
): NodeIdentifier[] {
  if (!Array.isArray(vs)) {
    // eslint-disable-next-line no-param-reassign
    vs = [vs];
  }

  const navigation = (g.isDirected() ? g.successors : g.neighbors).bind(g);

  const acc: any = [];
  /** @type Record<NodeIdentifier, boolean> */
  const visited = {};
  vs.forEach(v => {
    if (!g.hasNode(v)) {
      throw new Error(`Graph does not have node: ${v}`);
    }
    doDfs(g, v, order === 'post', visited, navigation, acc, callback);
  });
  return acc;
}
