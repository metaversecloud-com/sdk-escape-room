export const teleportVisitorToKeyAsset = async (
  world: any,
  visitor: any,
  uniqueName: string
) => {
  const keyAssets = await world.fetchDroppedAssetsWithUniqueName({
    uniqueName,
    isPartial: false,
  });

  if (!keyAssets || keyAssets.length === 0) {
    throw new Error(`Key asset ${uniqueName} not found`);
  }

  await visitor.moveVisitor({
    shouldTeleportVisitor: false,
    x: keyAssets[0].position?.x,
    y: keyAssets[0].position?.y + 100,
  });
};