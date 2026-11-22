import { useCallback, useContext, useEffect, useState, useRef } from "react";

import { content } from "@/constants";
import { ThemeConfig } from "@shared/themes";
import { backendAPI } from "@/utils";
import { GlobalStateContext } from "@/context/GlobalContext";
import { StatusPill } from "./StatusPill";
import { LibraryStartScreen } from "./LibraryStartScreen";
import { StartGameControls } from "./StartGameControls";
import type { StartMode, TeamSummary } from "./StartGameControls";
import commanderVegaImg from "@/assets/CommanderVega.png";

interface StartGameCardProps {
  theme: ThemeConfig;
  onStart: (options?: { multiplayer: boolean; teamId?: string }) => Promise<void>;
  isLoading: boolean;
}

const { briefing } = content;

export const StartGameCard = ({ theme, onStart, isLoading }: StartGameCardProps) => {
  const { profileId = "" } = useContext(GlobalStateContext);
  const [mode, setMode] = useState<StartMode>("solo");
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamSummary | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamMessage, setTeamMessage] = useState<string>("");
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const hasStartedTeamSession = useRef(false);
  const activeTeamRef = useRef<TeamSummary | null>(null);
  const selectedTeamIdRef = useRef("");
  const onStartRef = useRef(onStart);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const isSpaceTheme = theme.themeID === "SPACE";
  const teamFromRoster = teams.find((team) =>
    team.members?.some((member) => member.profileId === profileId),
  );
  const playerTeam = activeTeam || teamFromRoster || null;

  const teamHasStarted = playerTeam?.status === "started";

  const isTeamLeader =
    !!selectedTeam &&
    selectedTeam.leaderProfileId === profileId;

  const canStartTeam =
    mode !== "multiplayer" ||
    !selectedTeam ||
    selectedTeam.status !== "waiting" ||
    isTeamLeader;

  const refreshTeams = useCallback(async () => {
    try {
      const response = await backendAPI.get("/teams");
      const nextTeams: TeamSummary[] = response.data?.teams ?? [];
      const activeTeamForPlayer = nextTeams.find((team) =>
        team.members?.some((member) => member.profileId === profileId),
      );
      const previousActiveTeam = activeTeamRef.current;
      const previousSelectedTeamId = selectedTeamIdRef.current;

      setTeams(nextTeams);

      if (activeTeamForPlayer?.id) {
        activeTeamRef.current = activeTeamForPlayer;
        setActiveTeam(activeTeamForPlayer);
        setMode("multiplayer");
        selectedTeamIdRef.current = activeTeamForPlayer.id;
        setSelectedTeamId(activeTeamForPlayer.id);

        if (activeTeamForPlayer.status === "started") {
          setTeamMessage("The team run has started!");

          if (!hasStartedTeamSession.current) {
            hasStartedTeamSession.current = true;

            await onStartRef.current({
              multiplayer: true,
              teamId: activeTeamForPlayer.id,
            });
          }
        }
      } else {
        if (previousActiveTeam) {
          activeTeamRef.current = null;
          setActiveTeam(null);
          hasStartedTeamSession.current = false;
          setMode("multiplayer");
          setTeamMessage("You are no longer in that team. Create or join a team to play again.");
        }

        const nextSelectedTeamId = nextTeams.some((team) => team.id === previousSelectedTeamId)
          ? previousSelectedTeamId
          : nextTeams[0]?.id || "";
        selectedTeamIdRef.current = nextSelectedTeamId;
        setSelectedTeamId(nextSelectedTeamId);
      }
    } catch {
      setTeams([]);
      setTeamMessage("Unable to load team list right now.");
    }
  }, [profileId]);

  useEffect(() => {
    void refreshTeams();

    const handleTeamsUpdated = () => {
      void refreshTeams();
    };
    window.addEventListener("teams-updated", handleTeamsUpdated);

    return () => {
      window.removeEventListener("teams-updated", handleTeamsUpdated);
    };
  }, [refreshTeams]);

  const handleCreateTeam = async () => {
    try {
      setTeamMessage("Creating your team…");
      const response = await backendAPI.post("/teams/create");
      const createdTeam = response.data?.team as TeamSummary | undefined;
      const nextTeamId = createdTeam?.id;
      if (nextTeamId) {
        activeTeamRef.current = createdTeam;
        setActiveTeam(createdTeam);
        setTeams((currentTeams) => [
          ...currentTeams.filter((team) => team.id !== nextTeamId),
          createdTeam,
        ]);
        selectedTeamIdRef.current = nextTeamId;
        setSelectedTeamId(nextTeamId);
        setTeamMessage("Team created. Start when ready.");
      } else {
        setTeamMessage("Team creation returned no team id.");
      }
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTeamMessage(message || "Unable to create a team right now.");
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!teamId) return;

    try {
      setTeamMessage("Joining team…");
      const response = await backendAPI.post("/teams/join", { teamId });
      const joinedTeam =
        (response.data?.team as TeamSummary | undefined) ||
        teams.find((team) => team.id === teamId) ||
        { id: teamId, status: "waiting" as const };
      activeTeamRef.current = joinedTeam;
      setActiveTeam(joinedTeam);
      setTeams((currentTeams) => [
        ...currentTeams.filter((team) => team.id !== teamId),
        joinedTeam,
      ]);
      selectedTeamIdRef.current = teamId;
      setSelectedTeamId(teamId);
      setMode("multiplayer");
      setTeamMessage("Team joined. Wait for the leader to start the run.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTeamMessage(message || "Unable to join that team.");
    }
  };

  const handleLeaveTeam = async () => {
    if (!playerTeam || isLeavingTeam) return;
    activeTeamRef.current = playerTeam;

    try {
      setIsLeavingTeam(true);
      setTeamMessage("Leaving team…");
      const response = await backendAPI.post("/teams/leave");
      const nextTeams: TeamSummary[] = response.data?.teams ?? [];

      activeTeamRef.current = null;
      setActiveTeam(null);
      setTeams(nextTeams);
      const nextSelectedTeamId = nextTeams[0]?.id || "";
      selectedTeamIdRef.current = nextSelectedTeamId;
      setSelectedTeamId(nextSelectedTeamId);
      setMode("multiplayer");
      setTeamMessage("You left the team.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTeamMessage(message || "Unable to leave the team right now.");
    } finally {
      setIsLeavingTeam(false);
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

  const controls = (
    <StartGameControls
      mode={mode}
      onModeChange={setMode}
      teams={teams}
      activeTeam={playerTeam}
      selectedTeamId={selectedTeamId}
      onSelectedTeamIdChange={(teamId) => {
        selectedTeamIdRef.current = teamId;
        setSelectedTeamId(teamId);
      }}
      onCreateTeam={handleCreateTeam}
      onJoinTeam={handleJoinTeam}
      onLeaveTeam={handleLeaveTeam}
      isLeavingTeam={isLeavingTeam}
      onStart={handleStart}
      teamMessage={teamMessage}
      teamHasStarted={teamHasStarted}
      canStartTeam={canStartTeam}
      isLoading={isLoading}
      startButtonLabel={briefing.startButton}
      isSpaceTheme={isSpaceTheme}
    />
  );

  if (!isSpaceTheme) {
    return (
      <LibraryStartScreen theme={theme}>
        {controls}
      </LibraryStartScreen>
    );
  }

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

        {controls}
      </div>
    </div>
  );
};

export default StartGameCard;
