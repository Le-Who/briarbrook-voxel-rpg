# Multiplayer Readiness

## Recommendation

The project is ready for a small multiplayer preparation pass, but not for shared combat, open-world PvP, multiplayer housing permissions, or an MMO-style shard.

Recommended first prototype: **Shared Town Presence + Secure Trade**.

Why this scope:

- It tests the highest-value social loop: seeing other players, local chat, and trading.
- It avoids contested combat, shared dungeon loot, PvP, and housing permissions.
- It exercises item-instance safety, command validation, snapshots, events, and reconnect behavior.
- It keeps single-player progression intact.

Backend choice for the first 2-8 player test: **room server**.

- Use a room-authoritative server for movement, chat, and trade validation.
- Keep backend-platform evaluation for accounts, friends, groups, and live ops after the prototype proves the realtime loop.
- Avoid a custom bare WebSocket server until the authoritative command and trade rules are proven; it is easy to underbuild validation and reconnect behavior.

## Readiness Audit

| Area | Status | Evidence | Required Before Prototype |
| --- | --- | --- | --- |
| Player actions as commands | Minor refactor | `Simulation.dispatch` queues `GameAction`; `src/net/protocol.ts` maps a smaller `PlayerCommand` set. | Expand the network command map only for presence, chat, and trade. Do not expose every single-player action yet. |
| Simulation events | Minor refactor | `EventBus` emits command and movement events; gameplay systems also use chat, telemetry, quest, and transaction logs. | Add explicit server events for join/leave, chat, trade open/update/complete, inventory update, and rejected commands. |
| Gameplay truth separate from render/UI | Ready | `GameState`, systems, and `Simulation` own truth; `VoxelRenderer` reads state. | Keep server runtime headless and never depend on renderer/UI classes. |
| Stable entity IDs | Minor refactor | World entities use stable authored IDs; runtime IDs use `createId`. | Server must allocate runtime IDs and persist them in snapshots. Avoid client-created authoritative IDs. |
| Stable item instances | Ready for trade prototype | `ItemStack.uid` exists and equipment/storage/trade use item stacks. | Trade must reference `itemInstanceId`, not slot-only ownership. |
| Inventory transaction safety | Minor refactor | Bank, housing storage, market orders, crafting, and work orders validate before mutation. | Secure trade needs server-side item locks and final revalidation. |
| Trade transaction safety | Blocker for secure trade | Current local trade offers clone items and complete through local UI state. | Replace prototype trade with server-owned trade session: offer item IDs, unlock on change, double lock, final atomic swap. |
| Save/load serialization | Ready | `SaveLoad` and `SnapshotSerializer` serialize state without renderer objects. | Add a room snapshot schema that excludes local-only UI fields and volatile queues. |
| Determinism | Minor refactor | Many systems use `Math.random`, which is acceptable for solo and server-authoritative runs. | Shared combat later needs seeded/server RNG. Town presence and trade do not. |
| Duplication protection | Minor refactor | Work orders, market, housing storage, and protected containers have validation paths. | Trade item locks are required before two-client item exchange. |
| Single-player assumptions | Blocker for presence | `player.id` is fixed to `player`; `AuthoritativeSimulation` rejects non-`player` actors. | Introduce remote player records, room player IDs, and renderer nameplates/interpolation. |
| Crime/reputation safety | Ready for solo, not shared PvP | Guarded zones and criminal actions are explicit and warning-gated. | Keep PvP disabled for prototype. Do not share criminal aggression rules yet. |
| Housing permissions | Not in scope | Housing supports owner fields and plot state. | Do not prototype multiplayer housing permissions yet. |

## Chosen Prototype Scope

### Shared Town Presence

In scope:

- 2-8 players in Briarbrook town.
- Remote player avatars with nameplates.
- Server-authoritative movement.
- Client-side interpolation for remote players.
- Local chat broadcast.
- Emotes or short chat bubbles.
- Connection status and reconnect placeholder.

Out of scope:

- Shared combat.
- Shared resource depletion.
- Shared dungeons.
- PvP.
- Multiplayer housing.

### Secure Trade

In scope:

- Trade invite between nearby players.
- Offers reference item instance IDs.
- Server validates item ownership and proximity.
- Offer changes unlock both sides.
- Both players lock.
- Final accept revalidates ownership, inventory room, and gold.
- Atomic swap and transaction log.

Out of scope:

- Auction house.
- Offline trades.
- Mail.
- Player vendors.
- Dispute handling beyond transaction logs.

## Network Model

Server authoritative model:

1. Client sends `ClientCommand`.
2. Room server validates actor, zone, proximity, ownership, cooldown, and transaction preconditions.
3. Server mutates authoritative room state.
4. Server sends `ServerEvent` and periodic snapshots.
5. Clients interpolate remote players and reconcile local player movement.

Light prediction:

- Local movement prediction is acceptable.
- Trade, inventory, gold, crime, and market actions must not be predicted as final.

## Message Surface

Client commands for prototype:

- `MoveIntent`
- `InteractIntent`
- `ChatMessage`
- `Emote`
- `StartTrade`
- `UpdateTradeOffer`
- `LockTrade`
- `AcceptTrade`
- `CancelTrade`

Server events for prototype:

- `PlayerJoined`
- `PlayerLeft`
- `EntitySnapshot`
- `ChatBroadcast`
- `TradeOpened`
- `TradeUpdated`
- `TradeCompleted`
- `InventoryUpdated`
- `RejectedCommand`

## Implementation Plan

1. **Room state and remote players**
   - Add `RoomPlayerState` separate from single-player `PlayerState`.
   - Keep local save data separate from room presence data.
   - Render remote players as lightweight entities with nameplates.

2. **Room server shell**
   - Start with an in-process room adapter for tests.
   - Promote to a room-server package only after the command/session shape is stable.
   - Tick room state at the existing fixed tick rate.

3. **Town presence**
   - Map `MoveIntent` to validated movement.
   - Broadcast remote positions in snapshots.
   - Add interpolation buffers on clients.

4. **Local chat**
   - Route `ChatMessage` through the room.
   - Reuse `ChatPanel` rendering.
   - Add sender IDs and room timestamps.

5. **Secure trade**
   - Create server-owned trade sessions.
   - Offers reference item instance IDs and gold amounts.
   - Lock/unlock state is authoritative.
   - Final accept validates all item IDs and inventory room before one atomic mutation.

6. **Verification**
   - Two simulated clients connect to one room.
   - Both see each other move.
   - Chat is broadcast once.
   - Trade exchanges test items and gold.
   - Repeated final-accept attempts do not duplicate items.
   - Single-player tests still pass.

## Blockers To Close First

- Fixed local player ID: `player` must become a room-scoped local actor plus remote actors.
- `AuthoritativeSimulation.submitCommand` currently rejects any actor other than `player`.
- Secure trade must stop using cloned local offer slots as the source of truth.
- UI needs remote player nameplates, connection status, and trade invite surfaces.
- Snapshot payloads should separate authoritative room state from local-only UI state.

## Explicit Non-Goals

- No open-world PvP.
- No full-loot rules.
- No guilds.
- No multiplayer housing permissions.
- No large shard persistence.
- No rollback combat.
- No advanced anti-cheat beyond basic server validation for the prototype.
