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
 *   5 → Decode + Valve Order     (Room 2)
 *   6 → Restore Circuit          (Room 3)
 *   7 → Final Airlock Code       (Room 3)
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
  },

  /* ─── Leaderboard (standalone leaderboard screen) ──────────────────── */

  leaderboard: {
    pageTitle: "Leaderboard",
    emptyState: "No entries yet. Be the first to escape!",
    headers: { name: "Name", time: "Time", attempts: "Attempts" },
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
      title: "Door Locked",
      message: "You must complete all puzzles in the room before proceeding.",
    },
    invalidTarget: {
      title: "Nowhere to go",
      message: "There's no next room from here.",
    },
  },

  /* ─── Pre-game briefing (StartGameCard) ────────────────────────────── */

  briefing: {
    title: "Escape Room\nBriefing",
    intro:
      "“Welcome crew. This is Commander Vega. The station’s failing—your team has 30 minutes to bring Power, Comms, and the Airlock back online. Tap station assets for clues, crack the puzzles, and get us out.”",
    bullets: [
      "Repair route: Power Bay → Comms Deck → Airlock Control.",
      "Countdown: 30:00; if it hits zero, the station locks you out.",
      "Playstyle: Click assets in-world to pull up clues and puzzles. Solve to advance.",
    ],
    pills: [
      { label: "Power", detail: "Restore systems", color: "#1be0f2" },
      { label: "Comms", detail: "Align + decode", color: "#f6b300" },
      { label: "Airlock", detail: "Override to escape", color: "#9b7bff" },
    ],
    startButton: "Start the Game",
  },

  /* ─── Post-game exit / congrats screen (ExitCongratsCard) ──────────── */

  exitScreen: {
    eyebrow: "Mission Complete",
    title: "Congratulations — Airlock Opened",
    message:
      "Commander Vega: “Great work, crew. You restored Power, Comms, and Airlock. Grab your stats and see how you rank.”",
    yourTimeLabel: "Your Time",
    projectedRankPrefix: "Projected rank: #",
    topTimesLabel: "Top Escape Times",
    emptyLeaderboard: "No leaderboard entries yet.",
    tableHeaders: { rank: "Rank", crew: "Crew", time: "Time", attempts: "Attempts" },
  },

  /* ─── Empty / locked / expired states ──────────────────────────────── */

  states: {
    sessionExpired: {
      title: "Time has run out",
      message: "Click on the start terminal to start a new game.",
    },
    noActiveSession: {
      title: "No Active Session",
      message: "Start the game first before using the exit terminal.",
    },
    gameNotStarted: {
      title: "Game Not Started",
      message: "You must begin at the start terminal before accessing any puzzle.",
    },
    noScreenSelected: {
      title: "No Screen Selected",
      message:
        "This asset is missing a screen query parameter. Use ?screen=start, ?screen=exit, or ?screen=puzzle1 through ?screen=puzzle7.",
    },
    room2Locked: {
      title: "Room 2 Locked",
      message: "You must restore power in Room 1 before accessing the Comms Deck.",
    },
    room3Locked: {
      title: "Room 3 Locked",
      message: "You must complete Room 2 before accessing the reactor control room.",
    },
    puzzle5Locked: {
      title: "Puzzle Locked",
      message: "You must reconstruct the transmission first before decoding it.",
    },
    finalPuzzleLocked: {
      title: "Final Puzzle Locked",
      message: "Complete Puzzle 6 before attempting the final escape sequence.",
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
      description: `“Crew, this is Commander Vega. You're live inside the Power Bay. Start interacting with station assets to
        reroute power and get this room online.”`,
    },
    2: {
      title: "Comms Deck",
      description: `“Crew, welcome to the Comms Deck. Align the satellites, rebuild the transmission, and decode the valve order to
        stabilize the signal.”`,
      // Optional pills displayed below the description on the room intro.
      pills: [
        { label: "Satellite Alignment", detail: "Count the stars", color: "#1be0f2" },
        { label: "Retrieve the Transmission", detail: "Assemble the message", color: "#f6b300" },
        {
          label: "Decode the Transmission",
          detail: "Figure out what the message is and determine the correct valve order",
          color: "#9b7bff",
        },
      ],
    },
    3: {
      title: "Airlock Control",
      description: `“Crew, this is Commander Vega. You've made your way inside the Airlock Control. Restore the airlock circuit so that the keypad becomes operational.”`,
    },
  },

  /* ─── Per-puzzle copy ──────────────────────────────────────────────── */

  puzzles: {
    /* Puzzle 1 — Power Console (Room 1) */
    1: {
      title: "Power Console",
      description:
        "Set the three dials to the correct color sequence. Use the crew and reference panels to determine the correct sequence.",
      howToPlay: "Click each control to cycle through available colors.",
      controlLabelPrefix: "Control", // → "Control 1", "Control 2", ...
      currentPrefix: "Current:",
      submitLabel: "Submit Sequence",
      errors: {
        wrongSequence: "That sequence is not correct. Try again.",
      },
      complete: {
        title: "Power Bay Secure",
        flavor: "Electrical cabinet unlocked.",
        dialogueSpeaker: "Commander Vega",
        dialogue: "“Nice work, crew. Keep momentum!”",
        itemHtml: "You obtained a <strong>Fuse</strong>! (Serial: 74A1)",
        inventoryHint:
          "Check your inventory to view details about this item and how it might be used in upcoming puzzles.",
        // `itemName` is used both to look up the inventory image and as the <img alt>.
        itemName: "Fuse",
        artFrameClass: "er-art-frame--fuse",
      },
    },

    /* Puzzle 2 — Reactor Switch Array (Room 1) */
    2: {
      title: "Reactor Switch Array",
      description:
        "Reactor priming follows crew priority order. Translate crew priority to channel numbers, then run the remaining switch for the system check. Flip the breaker switches in the correct sequence before the system lockout.",
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
        correctSequenceReady: "Correct sequence entered. Submit to prime the reactor.",
        primedFallback: "Reactor primed.",
        badgeAwardedTemplate: "Reactor primed. Badge awarded: {badge}.",
        badgeAlreadyTemplate: "Badge already earned: {badge}.",
        badgeNotAwarded: "Badge could not be awarded.",
      },
      complete: {
        title: "Reactor Online",
        body: "Reactor sequence locked. Wrench (26B5) added to your inventory. Commander Vega: “Power Bay stabilized—proceed to the Comms Deck.”",
        itemName: "Wrench",
        artFrameClass: "er-art-frame--wrench",
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
        body: "The satellites are now in perfect alignment. Communication restored!",
      },
    },

    /* Puzzle 4 — Reconstruct Transmission (Room 2) */
    4: {
      title: "Reconstruct the Transmission",
      description: "Piece together the torn fragments to reveal the hidden message.",
      howToPlay:
        "Click a fragment to select it, then click another fragment to swap their positions. Correctly placed fragments will show a 🔒 icon and cannot be moved further.",
      submitIdleLabel: "Reconstruct Transmission",
      submitBusyLabel: "Reconstructing...",
      shuffleLabel: "Reset",
      progressTemplate: "Progress: {locked}/{total} fragments correctly placed",
      errors: {
        cannotSwapLocked: "🔒 Cannot swap with a locked fragment!",
        notAllLocked:
          "Not all fragments are in their correct positions! Keep rearranging until all fragments lock into place.",
      },
      complete: {
        title: "Communication Signal Aligned",
        heading: "The torn fragments reveal a scrambled transmission:",
        scrambled: ["EVLAV", "KLCO", "EURSSRPE"],
        teaser: "These scrambled words hold the key to the next puzzle...",
      },
    },

    /* Puzzle 5 — Transmission Decode + Valve Order (Room 2) */
    5: {
      title: "Transmission Decode & Valve Order",
      description: "Decode the scrambled transmission to reveal the system stabilization order.",
      hints: [
        "EVLAV → Rearrange these letters to form a device that controls flow (5 letters)",
        "KLCO → Rearrange these letters to form something that secures a door (4 letters)",
        "EURSSPE → Rearrange these letters to form something that pushes or exerts force (8 letters)",
      ],
      sections: {
        scrambled: "Scrambled Transmission",
        decoded: "Decoded Transmission",
        stabilization: "System Stabilization Order",
        valves: "Valve Control Panel",
        valveOrder: "Current Valve Activation Order",
      },
      scrambledWords: ["EVLAV", "KLCO", "EURSSPE"],
      wordInputLabels: ["Word 1:", "Word 2:", "Word 3:"],
      wordInputPlaceholder: "Enter decoded word",
      valveInstructions: "Click valves in the correct order according to the system stabilization order above.",
      emptyOrderMessage: "No valves activated yet. Click valves in the correct order!",
      submitIdleLabel: "Stabilize Communications",
      submitBusyLabel: "Stabilizing...",
      resetLabel: "Reset All",
      errors: {
        wordsNotDecoded: "The transmission words are not correctly unscrambled. Decode the scrambled message first!",
        wrongValveOrder: "The valve activation order is incorrect. Follow the system stabilization order!",
      },
      complete: {
        title: "Communications Stabilized",
        heading: "ACCESS CARD ACQUIRED",
        itemNotification: "Access card added to your inventory!",
        codeLabel: "Partial Airlock Code Revealed:",
        codeDisplay: "7 _ 3 _",
        teaser: "Check your inventory to see the Access Card. Proceed to Room 3!",
      },
    },

    /* Puzzle 6 — Restore Circuit (Room 3) */
    6: {
      title: "Restore Circuit",
      description: "Connect all nodes correctly",
      nodeLabels: {
        comms: "Comms",
        powerCore: "Power Core",
        airlock: "Airlock",
        signalRelay: "Signal Relay",
      },
      submitLabel: "Power On",
      messages: {
        incorrect: "⚠️ Incorrect... resetting",
        success: "System Online ✔",
      },
      complete: {
        title: "Airlock Systems Restored",
        body: "Commander Vega: “Circuit stabilized. The keypad is live—enter the override code to finish the escape.”",
      },
    },

    /* Puzzle 7 — Final Airlock Code (Room 3) */
    7: {
      title: "Final Airlock Code",
      description: "Enter final 4-digit code",
      hint: "Check your inventory items. Each item holds a few digits — use the digit from the same place value in both items to fill the blanks.",
      placeholder: "7 _ 3 _",
      submitLabel: "Submit Code",
      clearLabel: "C",
      backspaceLabel: "⌫",
      errors: {
        invalidFormat: "Enter a 4-digit code (numbers only).",
        wrongCode: "Incorrect code.",
        unexpected: "Unexpected error while submitting code.",
      },
      messages: {
        success: "Correct code! Airlock escape sequence activated.",
      },
    },
  },
};
