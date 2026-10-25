import {
  RoadGraph,
  RoadNode,
  RoadEdge,
  RouteCalculationResult
} from '../../../shared/contracts';

interface DijkstraNodeEntry {
  nodeId: string;
  distance: number;
  timeMin: number;
  prevNodeId?: string;
  prevEdge?: RoadEdge;
}

/**
 * Dijkstra / Hazard-Aware Shortest Path Routing Engine
 */
export class MediRouteGraphRouter {
  private graph: RoadGraph;

  constructor(graph?: RoadGraph) {
    this.graph = graph ? {
      nodes: graph.nodes.map(n => ({ ...n })),
      edges: graph.edges.map(e => ({ ...e }))
    } : MediRouteGraphRouter.getDemoRoadGraph();
  }

  /**
   * Calculate shortest viable route from origin to destination.
   * If allowBlockedEdges is false, all blocked roads are strictly avoided.
   */
  public calculateRoute(
    originNodeId: string,
    destinationNodeId: string,
    avoidBlockedEdges: boolean = true
  ): RouteCalculationResult {
    const originNode = this.graph.nodes.find(n => n.id === originNodeId);
    const destNode = this.graph.nodes.find(n => n.id === destinationNodeId);

    if (!originNode) {
      throw new Error(`Origin node "${originNodeId}" does not exist in road network.`);
    }
    if (!destNode) {
      throw new Error(`Destination node "${destinationNodeId}" does not exist in road network.`);
    }

    if (originNodeId === destinationNodeId) {
      return {
        originNodeId,
        destinationNodeId,
        pathNodeIds: [originNodeId],
        pathEdges: [],
        totalDistanceKm: 0,
        totalTimeMin: 0,
        blockedEdgesAvoided: [],
        hasRoute: true,
        message: 'Origin and destination are identical.'
      };
    }

    // Build adjacency list (bidirectional edges)
    const adjacency = new Map<string, Array<{ toNodeId: string; edge: RoadEdge }>>();
    for (const node of this.graph.nodes) {
      adjacency.set(node.id, []);
    }

    const blockedEdgesAvoided: string[] = [];

    for (const edge of this.graph.edges) {
      if (avoidBlockedEdges && edge.isBlocked) {
        blockedEdgesAvoided.push(edge.id);
        continue; // Skip blocked edge entirely
      }

      adjacency.get(edge.fromNodeId)?.push({ toNodeId: edge.toNodeId, edge });
      adjacency.get(edge.toNodeId)?.push({ toNodeId: edge.fromNodeId, edge });
    }

    // Dijkstra's algorithm prioritizing travel time
    const table = new Map<string, DijkstraNodeEntry>();
    for (const node of this.graph.nodes) {
      table.set(node.id, {
        nodeId: node.id,
        distance: Infinity,
        timeMin: Infinity
      });
    }

    table.set(originNodeId, {
      nodeId: originNodeId,
      distance: 0,
      timeMin: 0
    });

    const unvisited = new Set<string>(this.graph.nodes.map(n => n.id));

    while (unvisited.size > 0) {
      // Find unvisited node with lowest time
      let currentId: string | null = null;
      let minTime = Infinity;

      for (const id of unvisited) {
        const entry = table.get(id)!;
        if (entry.timeMin < minTime) {
          minTime = entry.timeMin;
          currentId = id;
        }
      }

      if (!currentId || minTime === Infinity) {
        break; // Remaining nodes are unreachable
      }

      if (currentId === destinationNodeId) {
        break; // Reached destination
      }

      unvisited.delete(currentId);
      const currentEntry = table.get(currentId)!;
      const neighbors = adjacency.get(currentId) || [];

      for (const { toNodeId, edge } of neighbors) {
        if (!unvisited.has(toNodeId)) continue;

        const candidateTime = currentEntry.timeMin + edge.baseTravelTimeMin;
        const candidateDist = currentEntry.distance + edge.distanceKm;
        const neighborEntry = table.get(toNodeId)!;

        if (candidateTime < neighborEntry.timeMin) {
          neighborEntry.timeMin = candidateTime;
          neighborEntry.distance = candidateDist;
          neighborEntry.prevNodeId = currentId;
          neighborEntry.prevEdge = edge;
        }
      }
    }

    const destEntry = table.get(destinationNodeId)!;
    if (destEntry.timeMin === Infinity) {
      return {
        originNodeId,
        destinationNodeId,
        pathNodeIds: [],
        pathEdges: [],
        totalDistanceKm: 0,
        totalTimeMin: 0,
        blockedEdgesAvoided,
        hasRoute: false,
        message: `No traversable evacuation route exists between ${originNode.label} and ${destNode.label} due to active road blockages.`
      };
    }

    // Reconstruct path
    const pathNodeIds: string[] = [];
    const pathEdges: RoadEdge[] = [];
    let curr: string | undefined = destinationNodeId;

    while (curr) {
      pathNodeIds.unshift(curr);
      const entry = table.get(curr);
      if (entry?.prevEdge) {
        pathEdges.unshift(entry.prevEdge);
      }
      curr = entry?.prevNodeId;
    }

    const hadToDetour = blockedEdgesAvoided.length > 0;
    const message = hadToDetour
      ? `Active hazard detour computed: Evacuation route safely diverts around ${blockedEdgesAvoided.length} blocked road segment(s). Estimated ETA: ${destEntry.timeMin} mins (${destEntry.distance.toFixed(1)} km).`
      : `Optimal direct evacuation route cleared: Estimated ETA ${destEntry.timeMin} mins (${destEntry.distance.toFixed(1)} km).`;

    return {
      originNodeId,
      destinationNodeId,
      pathNodeIds,
      pathEdges,
      totalDistanceKm: Number(destEntry.distance.toFixed(2)),
      totalTimeMin: Number(destEntry.timeMin.toFixed(1)),
      blockedEdgesAvoided,
      hasRoute: true,
      message
    };
  }

  /**
   * Set or toggle blockage status for an edge
   */
  public setEdgeBlockage(edgeId: string, isBlocked: boolean, blockageReason?: string): boolean {
    const edge = this.graph.edges.find(e => e.id === edgeId);
    if (edge) {
      edge.isBlocked = isBlocked;
      edge.blockageReason = blockageReason;
      return true;
    }
    return false;
  }

  public getGraph(): RoadGraph {
    return {
      nodes: this.graph.nodes.map(n => ({ ...n })),
      edges: this.graph.edges.map(e => ({ ...e }))
    };
  }

  /**
   * Default synthetic road graph connecting field stations to hospitals
   */
  public static getDemoRoadGraph(): RoadGraph {
    const nodes: RoadNode[] = [
      { id: 'AID-01', label: 'Aid Station Alpha (Forward Base)', lat: 34.050, lng: -118.250, type: 'aid_station' },
      { id: 'CAS-01', label: 'Casualty Pickup Site Echo', lat: 34.058, lng: -118.240, type: 'casualty_pickup' },
      { id: 'INT-01', label: 'Junction Central', lat: 34.065, lng: -118.235, type: 'intersection' },
      { id: 'BRG-01', label: 'Bridge Highway Alpha (Critical Span)', lat: 34.072, lng: -118.225, type: 'intersection' },
      { id: 'BYP-01', label: 'Southern Mountain Bypass', lat: 34.060, lng: -118.210, type: 'intersection' },
      { id: 'HOSP-01', label: 'General Field Hospital 4', lat: 34.080, lng: -118.200, type: 'hospital' }
    ];

    const edges: RoadEdge[] = [
      // Primary Highway Route (fastest when open)
      { id: 'E-AID-CAS', fromNodeId: 'AID-01', toNodeId: 'CAS-01', distanceKm: 2.1, baseTravelTimeMin: 5, isBlocked: false },
      { id: 'E-CAS-INT', fromNodeId: 'CAS-01', toNodeId: 'INT-01', distanceKm: 1.8, baseTravelTimeMin: 4, isBlocked: false },
      { id: 'E-INT-BRG', fromNodeId: 'INT-01', toNodeId: 'BRG-01', distanceKm: 2.5, baseTravelTimeMin: 6, isBlocked: false },
      { id: 'E-BRG-HOSP', fromNodeId: 'BRG-01', toNodeId: 'HOSP-01', distanceKm: 3.2, baseTravelTimeMin: 7, isBlocked: false },

      // Secondary Bypass Route (longer, but avoids Bridge)
      { id: 'E-INT-BYP', fromNodeId: 'INT-01', toNodeId: 'BYP-01', distanceKm: 4.5, baseTravelTimeMin: 12, isBlocked: false },
      { id: 'E-BYP-HOSP', fromNodeId: 'BYP-01', toNodeId: 'HOSP-01', distanceKm: 5.0, baseTravelTimeMin: 14, isBlocked: false }
    ];

    return { nodes, edges };
  }
}
