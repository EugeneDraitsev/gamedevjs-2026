import {
  createWeaponEdge,
  getWeaponNodeTemplate,
  type WeaponBuild,
  type WeaponFlowEdge,
  type WeaponFlowNode as WeaponFlowNodeType,
  type WeaponNodeRarity,
  type WeaponNodeType,
  weaponEntryNodeId,
  weaponExitNodeId,
} from "$lib/config/weapon-graph";

export const rarityOrder: WeaponNodeRarity[] = ["common", "uncommon", "rare"];
export const modifierLimit = 3;
export const entryPosition = { x: 40, y: 190 };
export const exitPosition = { x: 1030, y: 190 };
export const slotPositions = [
  { x: 250, y: 58 },
  { x: 520, y: 248 },
  { x: 790, y: 92 },
];

export const orderModifiers = (sourceNodes: WeaponFlowNodeType[]) =>
  sourceNodes
    .filter((node) => node.data.kind === "modifier")
    .toSorted(
      (left, right) =>
        left.position.x - right.position.x || left.position.y - right.position.y
    )
    .slice(0, modifierLimit)
    .map((node) => ({ ...node, draggable: true }));

export const buildPipeline = (sourceNodes: WeaponFlowNodeType[]) => {
  const entryNode = sourceNodes.find((node) => node.id === weaponEntryNodeId);
  const exitNode = sourceNodes.find((node) => node.id === weaponExitNodeId);
  const modifiers = orderModifiers(sourceNodes);
  const chain = [
    weaponEntryNodeId,
    ...modifiers.map((node) => node.id),
    weaponExitNodeId,
  ];

  return {
    edges: chain
      .slice(0, -1)
      .map((source, index) => createWeaponEdge(source, chain[index + 1])),
    nodes: [
      ...(entryNode
        ? [{ ...entryNode, draggable: false, position: entryPosition }]
        : []),
      ...modifiers,
      ...(exitNode
        ? [{ ...exitNode, draggable: false, position: exitPosition }]
        : []),
    ],
  };
};

export const getGraphSignature = (
  nextNodes: WeaponFlowNodeType[],
  nextEdges: WeaponFlowEdge[]
) =>
  JSON.stringify({
    edges: nextEdges.map((edge) => [edge.source, edge.target]),
    nodes: nextNodes.map((node) => [node.id, node.position.x, node.position.y]),
  });

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createPreviewPaths = (preview: WeaponBuild) => {
  const pathCount = preview.pelletCount;
  const isBeam = preview.attackMode === "beam";

  return Array.from({ length: pathCount }, (_, index) => {
    const laneOffset =
      pathCount === 1
        ? 0
        : (index / (pathCount - 1) - 0.5) *
          (isBeam ? preview.beamWidth * 90 : preview.spread * 120);
    const points =
      isBeam && preview.curve < 0.25
        ? [
            `18,${clamp(88 + laneOffset, 16, 152)}`,
            `238,${clamp(88 + laneOffset, 16, 152)}`,
          ]
        : Array.from({ length: 9 }, (__unused, step) => {
            const t = step / 8;
            const x = 18 + t * 220;
            const wave =
              Math.sin(t * Math.PI * (2.2 + preview.curve * 0.38)) *
              preview.curve *
              (isBeam ? 8.8 : 5.4);
            const drop = isBeam ? 0 : preview.gravity * t * t * 8;
            const y = 88 + laneOffset * t + wave + drop;

            return `${x},${clamp(y, 16, 152)}`;
          });

    return {
      endX: 238,
      endY: clamp(
        isBeam
          ? 88 + laneOffset
          : 88 +
              laneOffset +
              Math.sin(Math.PI * (2.2 + preview.curve * 0.38)) *
                preview.curve *
                5.4 +
              preview.gravity * 8,
        16,
        152
      ),
      id: `${index}-${preview.curve}-${preview.pelletCount}`,
      path: points.join(" "),
    };
  });
};

export const groupTemplatesByRarity = (availableModules: WeaponNodeType[]) =>
  rarityOrder
    .map((rarity) => ({
      items: availableModules
        .map((type, index) => ({
          id: `${type}-${index}`,
          template: getWeaponNodeTemplate(type),
          type,
        }))
        .filter((item) => item.template.rarity === rarity),
      rarity,
    }))
    .filter((group) => group.items.length > 0);

export const getDistanceBandLabel = (index: number) =>
  ["close", "mid", "far"][index] ?? "far";
