import { useEffect, useState } from "react";

import { content } from "@/constants";
import { backendAPI } from "@/utils";
import { StatusPill } from "./StatusPill";
import commanderVegaImg from "@/assets/CommanderVega.png";

interface StartGameCardProps {
  onStart: (options?: { multiplayer: boolean; teamId?: string }) => Promise<void>;
  isLoading: boolean;
}

type StartMode = "solo" | "multiplayer";

type TeamSummary = {
  id: string;
  leaderProfileId?: string;
  status?: "waiting" | "started" | "completed";
  createdBy?: { displayName?: string; username?: string };
  members?: Array<{ profileId?: string; displayName?: string; username?: string }>;
};

const { briefing } = content;

export const StartGameCard = ({ onStart, isLoading }: StartGameCardProps) => {
  const [mode, setMode] = useState<StartMode>("solo");
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamSummary | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamMessage, setTeamMessage] = useState<string>("");
  const [isRefreshingTeams, setIsRefreshingTeams] = useState(false);

  const currentProfileId = new URLSearchParams(window.location.search).get("profileId");

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  const teamHasStarted =
    activeTeam?.status === "started";

  const isTeamLeader =
    !!selectedTeam &&
    selectedTeam.leaderProfileId === currentProfileId;

  const canStartTeam =
    mode !== "multiplayer" ||
    !selectedTeam ||
    selectedTeam.status !== "waiting" ||
    isTeamLeader;

  const refreshTeams = async () => {
    setIsRefreshingTeams(true);
    try {
      const response = await backendAPI.get("/teams");
      const nextTeams: TeamSummary[] = response.data?.teams ?? [];
      const currentProfileId = new URLSearchParams(window.location.search).get("profileId");
      const activeTeamForPlayer = nextTeams.find((team) =>
        team.members?.some((member) => member.profileId === currentProfileId),
      );

      setTeams(nextTeams);
      if (activeTeamForPlayer?.id) {
        setActiveTeam(activeTeamForPlayer);
        setSelectedTeamId(activeTeamForPlayer.id);
      } else if (activeTeam?.id) {
        // The player's team may have started and disappeared
        // from the list of open teams.
        setSelectedTeamId(activeTeam.id);
      } else if (nextTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(nextTeams[0].id);
      }
    } catch {
      setTeams([]);
      setTeamMessage("Unable to load team list right now.");
    } finally {
      setIsRefreshingTeams(false);
    }
  };

  useEffect(() => {
    if (mode !== "multiplayer") {
      setSelectedTeamId("");
      return;
    }

    void refreshTeams();

    const interval = window.setInterval(() => {
      void refreshTeams();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [mode]);

  const handleCreateTeam = async () => {
    try {
      setTeamMessage("Creating your team…");
      const response = await backendAPI.post("/teams/create");
      const nextTeamId = response.data?.team?.id;
      if (nextTeamId) {
        setSelectedTeamId(nextTeamId);
        setTeamMessage("Team created. Start when ready.");
      } else {
        setTeamMessage("Team creation returned no team id.");
      }
      await refreshTeams();
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTeamMessage(message || "Unable to create a team right now.");
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!teamId) return;

    try {
      setTeamMessage("Joining team…");
      await backendAPI.post("/teams/join", { teamId });
      setSelectedTeamId(teamId);
      setTeamMessage("Team joined. Wait for the leader to start the run.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTeamMessage(message || "Unable to join that team.");
    }
  };

  const handleStart = async () => {
    if (mode === "multiplayer" && !selectedTeamId) {
      setTeamMessage("Create or join a team before you start the game.");
      return;
    }

    await onStart(
      mode === "multiplayer" ? { multiplayer: true, teamId: selectedTeamId } : { multiplayer: false },
    );
  };

  return (
    <div className="grid gap-3">
      <div aria-hidden className="er-card__glow" />
      <div className="flex flex-col gap-4 er-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="card-title er-title-gold" style={{ whiteSpace: "pre-line" }}>
            {briefing.title}
          </h3>
        </div>

        <div className="flex items-start gap-3">
          <img
            src={commanderVegaImg}
            alt="Commander Vega"
            className="flex-shrink-0 rounded-lg"
            style={{ width: 96, height: 96, objectFit: "cover" }}
          />
          <p className="p2 er-text">{briefing.intro}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {briefing.pills.map((pill) => (
            <StatusPill key={pill.label} label={pill.label} detail={pill.detail} color={pill.color} />
          ))}
        </div>

        <div className="card-details mt-2 grid gap-3">


          {!teamHasStarted && (
            <>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={mode === "solo" ? "btn er-btn-primary" : "btn btn-outline"}
                  onClick={() => setMode("solo")}
                >
                  Solo
                </button>

                <button
                  type="button"
                  className={mode === "multiplayer" ? "btn er-btn-primary" : "btn btn-outline"}
                  onClick={() => setMode("multiplayer")}
                >
                  Multiplayer
                </button>
              </div>

              {mode === "multiplayer" && (
                <div className="grid gap-3 rounded-lg border border-slate-600/70 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleCreateTeam}
                      disabled={isLoading}
                    >
                      Create team
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => void refreshTeams()}
                      disabled={isRefreshingTeams || isLoading}
                    >
                      {isRefreshingTeams ? "Refreshing…" : "Refresh teams"}
                    </button>
                  </div>

                  {teams.length > 0 ? (
                    <div className="grid gap-2">
                      <label className="p2 er-text" htmlFor="team-select">
                        Join an open team
                      </label>

                      <select
                        id="team-select"
                        className="input"
                        value={selectedTeamId}
                        onChange={(event) => setSelectedTeamId(event.target.value)}
                        disabled={isLoading}
                      >
                        <option value="">Select a team</option>

                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.createdBy?.displayName ||
                              team.createdBy?.username ||
                              "Team"}{" "}
                            · {team.members?.length ?? 0} member
                            {team.members?.length === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>

                      {selectedTeamId && (
                        <button
                          type="button"
                          className="btn btn-outline w-full sm:w-auto"
                          onClick={() => void handleJoinTeam(selectedTeamId)}
                          disabled={isLoading}
                        >
                          Join selected team
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="p2 er-text">
                      No teams are open yet. Create a team to invite others.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {teamMessage && !teamHasStarted && (
            <p className="p2 er-text">{teamMessage}</p>
          )}
        </div>

        <div className="card-actions mt-2">
          <button
            className="btn er-btn-primary w-full sm:w-auto"
            onClick={() => void handleStart()}
            disabled={isLoading || !canStartTeam}
          >
            {mode === "multiplayer" ? "Start team run" : briefing.startButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartGameCard;
