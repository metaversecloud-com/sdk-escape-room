import { World, DroppedAsset } from "./topiaInit.js";
import { getVisitor } from "./getVisitor.js";
import { Credentials } from "../types/index.js";
import { standardizeError } from "./standardizeError.js";

/// This function handles teleporting a visitor to a specified room within the escape room game. It retrieves the visitor's current state, checks the world configuration for spawn points, and moves the visitor to the appropriate coordinates based on the target room. If any errors occur during this process, they are standardized and thrown for handling by the calling function.

type SpawnPoint = { x: number; y: number };

// Define the configuration structure for teleportation points within the world; this allows us to specify different spawn coordinates for the starting point and each room, which can be used to teleport the player to the correct location when they move between rooms or start the game.
interface WorldTeleportConfig {
  spawns?: {
    start?: SpawnPoint;
    roomA?: SpawnPoint;
    roomB?: SpawnPoint;
    roomC?: SpawnPoint;
  };
  anchorNames?: Record<string, string>;
}

// Map the room identifiers to the corresponding keys in the world teleport configuration; this allows us to easily look up the correct spawn point for each room when we need to teleport the player.
const roomToSpawnKey: Record<"A" | "B" | "C" | "start", keyof NonNullable<WorldTeleportConfig["spawns"]>> = {
  A: "roomA",
  B: "roomB",
  C: "roomC",
  start: "start",
};

// This function handles the logic of teleporting a visitor to a specified room; it retrieves the visitor's current state, checks the world configuration for spawn points, and moves the visitor to the appropriate coordinates based on the target room. If any errors occur during this process, they are standardized and thrown for handling by the calling function.
export const teleportVisitor = async (credentials: Credentials, room: "A" | "B" | "C" | "start") => {
  try {
    const { urlSlug, sceneDropId } = credentials;
    const { visitor } = await getVisitor(credentials, true);

    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = (world as any).dataObject as Record<
      string,
      { keyAssetId?: string; config?: WorldTeleportConfig }
    >;

    const sceneConfig = worldData?.[sceneDropId];
    const spawnIdForRoom =
      room === "A"
        ? sceneConfig?.config?.roomASpawnId
        : room === "B"
        ? sceneConfig?.config?.roomBSpawnId
        : room === "C"
        ? sceneConfig?.config?.roomCSpawnId
        : sceneConfig?.config?.startSpawnId;
    const spawnConfig: WorldTeleportConfig["spawns"] | undefined = sceneConfig?.config?.spawns;
    const anchorNames = sceneConfig?.config?.anchorNames;

    // Try spawnId -> DroppedAsset position
    if (spawnIdForRoom) {
      try {
        const spawnAsset = await DroppedAsset.get(spawnIdForRoom, urlSlug, { credentials });
        await spawnAsset.fetchDroppedAssetById?.();
        if (spawnAsset.position) {
          await visitor.moveVisitor({ shouldTeleportVisitor: true, x: spawnAsset.position.x, y: spawnAsset.position.y });
          return { success: true, spawn: spawnAsset.position };
        }
      } catch (e) {
        console.warn("Spawn asset lookup failed", e);
      }
    }

    // Prefer anchor assets by uniqueName; fallback to stored spawn coords.
    if (anchorNames && anchorNames[room]) {
      const anchors = await world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName: anchorNames[room] });
      const anchor = anchors?.[0];
      if (anchor?.position) {
        await visitor.moveVisitor({
          shouldTeleportVisitor: true,
          x: anchor.position.x,
          y: anchor.position.y,
        });
        return { success: true, spawn: anchor.position };
      }
    }

    // If the world configuration is missing spawn points, we log a warning and skip the teleportation to avoid hard failure; this allows the game to continue functioning even if the teleportation configuration is not set up correctly, while providing visibility into the issue for debugging purposes.
    if (!spawnConfig) {
      console.warn("Teleport skipped: world config missing spawns", { sceneDropId, room });
      return { success: false, reason: "missing spawns" };
    }

    // Determine the spawn point key based on the target room and look up the corresponding spawn coordinates from the world configuration; if the spawn coordinates are missing for the specified room, skip teleport to avoid hard failure.
    const spawnKey = roomToSpawnKey[room];
    const spawn = spawnConfig[spawnKey];
    // If the spawn coordinates are missing for the specified room, we log a warning and skip the teleportation to avoid hard failure; this allows the game to continue functioning even if the specific spawn point for a room is not set up correctly, while providing visibility into the issue for debugging purposes.
    if (!spawn) {
      console.warn(`Teleport skipped: spawn coords missing for ${room}`, { sceneDropId, room });
      return { success: false, reason: "missing spawn coords" };
    }

    // Move the visitor to the specified spawn coordinates with teleportation enabled; this will update the player's location in the game world to the new room or starting point as needed.
    await visitor.moveVisitor({
      shouldTeleportVisitor: true,
      x: spawn.x,
      y: spawn.y,
    });

    return { success: true, spawn };
  } catch (error) {
    throw standardizeError(error);
  }
};
