/**
 * Single source of truth for every user-facing string in the Escape Room app.
 *
 * Goal: a non-engineer (product manager, copy editor, themer) can open this
 * file, scan it top-to-bottom, and edit any text without touching component
 * code. Future themes (medieval dungeon, haunted house, etc.) can fork this
 * file and swap content while reusing the same component tree.
 *
 * Organization, top-down:
 *   - `ui`               — reusable button/hint labels shared across screens
 *   - `inventory`        — inventory panel + tile copy
 *   - `leaderboard`      — leaderboard table + page header copy
 *   - `statusBar`        — in-game header (timer / room / inventory button)
 *   - `exitConfirmation` — "are you sure you want to exit?" modal
 *   - `exitButton`       — bottom exit-game button label
 *   - `briefing`         — pre-game StartGameCard (intro narrative + pills)
 *   - `exitScreen`       — post-game ExitCongratsCard (stats + leaderboard)
 *   - `states`           — locked-room / session-expired / no-screen messages
 *   - `admin`            — admin panel placeholder
 *   - `rooms`            — per-room intro card text (and optional intro pills)
 *   - `puzzles`          — per-puzzle title, instructions, errors, complete
 *                          card. Each puzzle has a `complete` sub-object for
 *                          the post-solve celebration card.
 *
 * Puzzle map for reference:
 *   1 → Power Console            (Room 1)
 *   2 → Reactor Switch Array     (Room 1)
 *   3 → Satellite Alignment      (Room 2)
 *   4 → Reconstruct Transmission (Room 2)
 *   5 → Unscramble Transmission + Comms System Order     (Room 2)
 *   6 → Restore Circuit          (Room 3)
 *   7 → Final Escape Hatch Code       (Room 3)
 */
export const content = {
  /* ─── Reusable chrome strings ───────────────────────────────────────── */

  ui: {
    hints: {
      show: "💡 Show Hints",
      hide: "Hide Hints",
    },
  },

  /* ─── Inventory panel ───────────────────────────────────────────────── */

  inventory: {
    panelTitle: "Mission Items",
    clickHint: "Click on an item below to enlarge it",
    emptyState: "Nothing in your inventory yet. Solve puzzles to collect mission items.",
    noPreview: "No preview",
    noLargerImage: "No larger image available for this item.",
    tabs: { keyItems: "Key Items", artifacts: "Artifacts" },
    keyItemsEmpty: "No key items yet. Solve puzzles to earn them.",
    artifactsEmpty: "No artifacts yet. Explore the station to find them.",
    artifactsEmptyForRoom: "No artifacts from this room yet.",
    roomFilterLabel: "Filter by room",
    roomFilterAll: "All",
    roomFilterTemplate: "Room {room}",
  },

  /* ─── Leaderboard (standalone leaderboard screen) ──────────────────── */

  leaderboard: {
    pageTitle: "Hall of Fame",
    tabs: { leaderboard: "Leaderboard", badges: "Badges" },
    emptyState: "No entries yet. Be the first to escape!",
    headers: { name: "Name", time: "Time", attempts: "Attempts" },
    badgesTab: {
      emptyState: "No badges configured yet. Check back after the world's been set up.",
      earnedLabel: "Earned",
      lockedLabel: "Locked",
    },
  },

  /* ─── In-game status bar ───────────────────────────────────────────── */

  statusBar: {
    timerLabel: "Timer:",
    roomLabel: "Room:",
    roomPlaceholder: "--",
    inventoryButton: "Inventory",
  },

  /* ─── Exit-game confirmation modal + bottom button ─────────────────── */

  exitConfirmation: {
    title: "Exit Game",
    message: "Are you sure you want to exit the game? Your progress will NOT be saved.",
    stayButton: "Stay Here",
  },
  exitButton: "Exit",

  /* ─── Teleport (room→room) screen ─────────────────────────────────────
     Shown when the player clicks an in-world teleport pad. The client
     hits /api/teleport which checks puzzle prerequisites and, if met,
     moves the player to the destination room's spawn. Each sub-object
     is the copy for one possible outcome.
  */

  teleport: {
    loading: {
      title: "Teleporting…",
      message: "Checking your progress.",
    },
    // Success has no copy of its own — on success the destination room's
    // `RoomIntroCard` is rendered instead (title + description live under
    // `content.rooms[N]`).
    blocked: {
      title: "Teleporter Locked",
      message: "Finish all the puzzles in this room to unlock the teleporter.",
    },
    invalidTarget: {
      title: "Nowhere to go",
      message: "There's no next room from here.",
    },
  },

  /* ─── Artifact / collectible screens ─────────────────────────────────
     Shown when a player clicks an in-world artifact asset. The item is
     granted (if not already owned) and shown to the player on a card.
  */

  artifactGrant: {
    loading: { title: "Examining artifact…", message: "Adding it to your inventory." },
    newGrant: {
      title: "Artifact Acquired",
      message: "Added to your inventory. Check the Artifacts tab to revisit it.",
    },
    alreadyHad: { title: "Already in Your Inventory", message: "You've already picked this one up." },
    notFound: { title: "Artifact Unavailable", message: "This artifact isn't configured in the ecosystem yet." },
    locked: {
      title: "Out of Reach",
      // `{room}` replaced with the artifact's required room number.
      messageTemplate: "You need to make it to Room {room} before you can pick this artifact up.",
    },
  },

  /* ─── Decoy / trash discovery (`?screen=decoy`) ───────────────────────
     Shown when a player investigates a decoy/trash asset. Awards the
     **Trash Digger** badge on first discovery.
  */

  decoy: {
    loading: { title: "Sifting through the debris…", message: "Looking for anything useful." },
    newDiscovery: {
      eyebrow: "Just Trash",
      title: "Nothing useful here.",
      message: "Burnt wires, snack wrappers, a busted clipboard. But you did earn the Trash Digger badge.",
    },
    alreadyHad: {
      eyebrow: "Already Picked Over",
      title: "Same trash, different day.",
      message: "You've sifted through this junk before. Trash Digger badge is already yours.",
    },
  },

  /* ─── Pre-game briefing (StartGameCard) ────────────────────────────── */

  briefing: {
    title: "Escape Room\nBriefing",
    intro:
      "“Welcome, Crew. This is Commander Vega. The station is failing and we have only 30 MINUTES of oxygen left. You must bring Power, Comms, and the Airlock back online and get us out before the air runs out! Click around the station for clues and crack the puzzles to escape!”",
    pills: [
      {
        label: "How to Play",
        detail: "Click machines, posters, and other items to collect clues and find puzzles.",
        color: "#1be0f2",
      },
      {
        label: "Inventory",
        detail: "Inventory items contain information that you will need to solve puzzles.",
        color: "#f6b300",
      },
      { label: "The Station", detail: "Three Rooms: Power, Comms, and Airlock.", color: "#1be0f2" },
      {
        label: "How to Progress",
        detail: "Clear every puzzle in a room to unlock the next room's teleporter.",
        color: "#9b7bff",
      },
      { label: "Tip #1", detail: "Taking notes may help you!", color: "#3fe0a0" },
      {
        label: "Tip #2",
        detail: "You can right-click to open inventory images in a new browser tab if needed.",
        color: "#3fe0a0",
      },
    ],
    startButton: "Start the Game",
  },

  /* ─── Mid-game start terminal (SessionInProgressCard) ────────────────
     Shown when the player clicks the start terminal AFTER they've already
     started a run. Lets them restart (wipes progress + new session) or
     teleport back to the room they should currently be in.
  */

  sessionInProgress: {
    eyebrow: "Mission Underway",
    title: "Session in Progress",
    message: "You already started. Jump back to where you were, or erase your progress and start over.",
    currentRoomLabel: "Current room",
    teleportButton: "Teleport me back",
    restartButton: "Restart from scratch",
    // Confirmation modal copy gating the destructive restart.
    restartConfirmTitle: "Restart Game?",
    restartConfirmMessage: "Your current progress will be erased and you'll be sent back to Room 1.",
  },

  /* ─── Post-game exit / congrats screen (ExitCongratsCard) ──────────── */

  exitScreen: {
    eyebrow: "Mission Complete",
    title: "Congratulations — Airlock Opened",
    message:
      "Commander Vega: “Great work, Crew. You restored the Power, Comms, and Airlock. And you escaped just in time! Grab your stats and see how you rank.”",
    yourTimeLabel: "Your Time",
    projectedRankPrefix: "Current rank: #",
    topTimesLabel: "Top Escape Times",
    emptyLeaderboard: "No leaderboard entries yet.",
    tableHeaders: { rank: "Rank", crew: "Crew", time: "Time", attempts: "Attempts" },
  },

  /* ─── Empty / locked / expired states ──────────────────────────────── */

  states: {
    sessionExpired: {
      title: "Time has run out",
      message: "Click on the Start button to start a new game.",
    },
    gameNotStarted: {
      title: "Game Not Started",
      message: "You must begin at the Start button before accessing any puzzle.",
    },
    noScreenSelected: {
      title: "No Screen Selected",
      message:
        "This asset is missing a screen query parameter. Use ?screen=start, ?screen=exit, or ?screen=puzzle1 through ?screen=puzzle7.",
    },
    room2Locked: {
      title: "Room 2 Locked",
      message: "You must restore power in Room 1 before accessing Room 2.",
    },
    room3Locked: {
      title: "Room 3 Locked",
      message: "You must complete Room 2 before accessing Room 3.",
    },
    puzzle5Locked: {
      title: "Puzzle Locked",
      message: "Reconstruct the transmission first, and then you can decode it here.",
    },
    finalPuzzleLocked: {
      title: "Final Puzzle Locked",
      message: "Finish the Airlock Circuit puzzle before attempting your final escape!",
    },
  },

  /* ─── Admin panel placeholder ──────────────────────────────────────── */

  admin: {
    title: "Admin Panel",
    placeholder: "No admin actions are configured yet.",
  },

  /* ─── Per-room intro card text ─────────────────────────────────────── */

  rooms: {
    1: {
      title: "Power Bay",
      description: `“Crew, this is Commander Vega. You're live inside the Power Bay. You need to figure out how to start up the reactor and reroute power to get this room online.”`,
      // Optional pills displayed below the description on the room intro.
      pills: [
        {
          label: "How to Play",
          detail: "Click machines, posters, and other items to collect clues and find puzzles.",
          color: "#1be0f2",
        },
        {
          label: "Inventory",
          detail: "Inventory items contain information that you will need to solve puzzles.",
          color: "#f6b300",
        },
        {
          label: "How to Progress",
          detail: "Clear every puzzle in this room to unlock the teleporter to the next room.",
          color: "#9b7bff",
        },
        { label: "Tip #1", detail: "Taking notes may help you!", color: "#3fe0a0" },
        {
          label: "Tip #2",
          detail: "You can right-click to open inventory images in a new browser tab, if needed.",
          color: "#3fe0a0",
        },
      ],
    },
    2: {
      title: "Comms Deck",
      description: `“Crew, welcome to the Comms Deck. Align the satellites, reconstruct the torn-up transmission, and decode the system activation order to stabilize the signal.”`,
      // Optional pills displayed below the description on the room intro.
      pills: [
        {
          label: "How to Play",
          detail: "Click machines, posters, and other items to collect clues and find puzzles.",
          color: "#1be0f2",
        },
        {
          label: "Inventory",
          detail: "Inventory items contain information that you will need to solve puzzles.",
          color: "#f6b300",
        },
        {
          label: "How to Progress",
          detail: "Clear every puzzle in this room to unlock the teleporter to the next room.",
          color: "#9b7bff",
        },
        { label: "Tip #1", detail: "Taking notes may help you!", color: "#3fe0a0" },
        {
          label: "Tip #2",
          detail: "You can right-click to open inventory images in a new browser tab, if needed.",
          color: "#3fe0a0",
        },
      ],
    },
    3: {
      title: "Airlock",
      description: `“Crew, this is Commander Vega. You've made your way inside the Airlock Control. Restore the airlock circuit, then unlock the escape hatch to get out of here!”`,
      pills: [
        {
          label: "How to Play",
          detail: "Click machines, posters, and other items to collect clues and find puzzles.",
          color: "#1be0f2",
        },
        {
          label: "Inventory",
          detail: "Inventory items contain information that you will need to solve puzzles.",
          color: "#f6b300",
        },
        {
          label: "How to Progress",
          detail: "Clear every puzzle in this room to unlock the teleporter to the next room.",
          color: "#9b7bff",
        },
        { label: "Tip #1", detail: "Taking notes may help you!", color: "#3fe0a0" },
        {
          label: "Tip #2",
          detail: "You can right-click to open inventory images in a new browser tab, if needed.",
          color: "#3fe0a0",
        },
      ],
    },
  },

  /* ─── Per-puzzle copy ──────────────────────────────────────────────── */

  puzzles: {
    /* Puzzle 1 — Power Console (Room 1) */
    1: {
      title: "Main Power Panel",
      description: "Main power is down. See if you can find clues to the secret restart code in the crew portraits.",
      howToPlay: "Click each dial to cycle through its colors.",
      controlLabelPrefix: "Dial",
      currentPrefix: "Current:",
      submitLabel: "Submit Sequence",
      resetLabel: "Reset",
      errors: {
        wrongSequence: "That sequence is not correct. Try again.",
      },
      complete: {
        title: "Main Power Restarted",
        heading: "BATTERY ACQUIRED",
        flavor: "Main power has been restarted.",
        dialogueSpeaker: "Commander Vega",
        dialogue: "“Nice work, crew. Keep it up!”",
        body: "A Battery has been added to your inventory",
        itemName: "Battery",
      },
      alreadyComplete: {
        title: "Main Power Restarted",
        heading: "BATTERY",
        body: "Already in your inventory",
        itemName: "Battery",
      },
    },

    /* Puzzle 2 — Reactor Switch Array (Room 1) */
    2: {
      title: "Reactor Switches",
      description:
        "The Reactor can only be started up safely by flipping the four breakers in the correct order. You must do it quickly before the system locks you out.",
      timerPrefix: "Time Left:", // → "Time Left: 8s"
      currentOrderLabel: "Current Order:",
      noneLabel: "None",
      lockedLabel: "Locked",
      resetLabel: "Reset",
      submitLabel: "Submit Sequence",
      errors: {
        timeExpired: "Time expired. The switches have been reset.",
        incorrect: "Incorrect sequence. Switches have been reset.",
      },
      messages: {
        correctSequenceReady: "Correct order! Submit to bring the reactor online.",
        primedFallback: "Reactor online.",
        badgeAwardedTemplate: "Reactor online. Badge awarded: {badge}.",
        badgeAlreadyTemplate: "Badge already earned: {badge}.",
        badgeNotAwarded: "Badge could not be awarded.",
      },
      complete: {
        title: "Reactor Online",
        heading: "FUSE ACQUIRED",
        body: "The reactor is ready to go. Fuse added to your inventory.",
        itemName: "Fuse",
      },
      alreadyComplete: {
        title: "Reactor Online",
        heading: "FUSE",
        body: "Already in your inventory",
        itemName: "Fuse",
      },
    },

    /* Puzzle 3 — Satellite Alignment (Room 2) */
    3: {
      title: "Satellite Alignment System",
      description: "Align the communication satellites to restore the signal.",
      satelliteNames: ["Alpha Satellite", "Beta Satellite", "Omega Satellite"],
      submitIdleLabel: "Align Satellites",
      submitBusyLabel: "Aligning...",
      resetLabel: "Reset",
      errors: {
        invalidNumber: "Please enter a valid number",
        outOfRangeTemplate: "Value must be between {min} and {max}",
        wrongAlignment: "Incorrect alignment. The satellites are not properly aligned.",
      },
      complete: {
        title: "Communication Signal Aligned",
        heading: "WRENCH ACQUIRED",
        body: "The satellites are now lined up perfectly. Communication restored! Wrench added to your inventory.",
        itemName: "Wrench",
      },
      alreadyComplete: {
        title: "Communication Signal Aligned",
        heading: "WRENCH",
        body: "Already in your inventory",
        itemName: "Wrench",
      },
    },

    /* Puzzle 4 — Reconstruct Transmission (Room 2) */
    4: {
      title: "Reconstruct the Transmission",
      description: "Put the torn piece back together to reveal the hidden message.",
      howToPlay:
        "Click a piece to select it, then click another piece to swap them. Correctly placed pieces will show a 🔒 icon and cannot be moved further.",
      submitIdleLabel: "Reconstruct Transmission",
      submitBusyLabel: "Reconstructing...",
      shuffleLabel: "Reset",
      progressTemplate: "Progress: {locked}/{total} pieces correctly placed",
      errors: {
        cannotSwapLocked: "🔒 Cannot swap with a locked piece!",
        notAllLocked:
          "Not all pieces are in their correct positions! Keep rearranging until all pieces lock into place.",
      },
      complete: {
        title: "Transmission Reconstructed",
        heading: "The torn pieces reveal a scrambled transmission:",
        scrambled: ["EVLAV", "KLCO", "EURSSRPE"],
        teaser: "These scrambled words hold the key to the next puzzle...",
      },
    },

    /* Puzzle 5 — Unscramble Transmission + Comms System Order (Room 2) */
    5: {
      title: "Unscramble & Activate Comms Systems",
      description: "Decode the scrambled transmission to reveal the comms system activation order.",
      hints: [
        "EVLAV → Rearrange these letters to form a device that controls flow (5 letters)",
        "KLCO → Rearrange these letters to form something that secures a door (4 letters)",
        "EURSSRPE → Rearrange these letters to form something that pushes or exerts force (8 letters)",
      ],
      sections: {
        scrambled: "Scrambled Transmission",
        decoded: "Decoded Transmission",
        stabilization: "System Activation Order",
        valves: "System Control Panel",
        valveOrder: "Current System Activation Order",
      },
      scrambledWords: ["EVLAV", "KLCO", "EURSSRPE"],
      wordInputLabels: ["Word 1:", "Word 2:", "Word 3:"],
      wordInputPlaceholder: "Enter decoded word",
      valveInstructions: "Click the buttons in the correct order according to the comms system activation order above.",
      emptyOrderMessage: "No comms systems activated yet. Click the buttons in the correct order!",
      submitIdleLabel: "Stabilize Communications",
      submitBusyLabel: "Stabilizing...",
      resetLabel: "Reset All",
      errors: {
        wordsNotDecoded: "The words are not unscrambled yet. Decode the scrambled message first!",
        wrongValveOrder:
          "The comms system activation order is incorrect. Follow the order decoded from the transmission!",
      },
      complete: {
        title: "Communications Stabilized",
        heading: "CIRCUIT CHIP ACQUIRED",
        body: "A Circuit Chip has been added to your inventory!",
        itemName: "Circuit Chip",
      },
      alreadyComplete: {
        title: "Communications Stabilized",
        heading: "CIRCUIT CHIP",
        body: "Already in your inventory",
        itemName: "Circuit Chip",
      },
    },

    /* Puzzle 6 — Restore Circuit (Room 3) */
    6: {
      title: "Restore Circuit",
      description: "Connect all nodes and wires correctly",
      nodeLabels: {
        comms: "Comms",
        powerCore: "Power Core",
        airlock: "Airlock",
        signalRelay: "Signal Relay",
      },
      submitLabel: "Power On",
      resetLabel: "Reset",
      messages: {
        incorrect: "⚠️ Incorrect... resetting",
        success: "System Online ✔",
      },
      complete: {
        title: "Airlock Circuit Restored",
        body: "Commander Vega: “Circuit stabilized. The keypad is live! Enter the override code to unlock the hatch and escape!”",
      },
      alreadyComplete: {
        title: "Airlock Circuit Restored",
        body: "Circuit already restored. Enter the override code on the keypad to unlock the hatch and escape!",
      },
    },

    /* Puzzle 7 — Final Airlock Code (Room 3) */
    7: {
      title: "Final Escape Hatch Code",
      description: "Enter final 4-digit code",
      hint: "Each Key Item has one marked digit — enter it in the slot that matches that item's color.",
      submitLabel: "Submit Code",
      clearLabel: "C",
      backspaceLabel: "⌫",
      errors: {
        invalidFormat: "Enter a 4-digit code (numbers only).",
        wrongCode: "Incorrect code.",
        unexpected: "Unexpected error while submitting code.",
      },
      messages: {
        success: "Correct code! Hatch unlocked. Escape sequence activated!",
      },
    },
  },
};
