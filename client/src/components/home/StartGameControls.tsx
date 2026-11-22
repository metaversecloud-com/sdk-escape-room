export type StartMode = "solo" | "multiplayer";

type TeamMember = {
  profileId?: string;
  displayName?: string;
  username?: string;
};

export type TeamSummary = {
  id: string;
  leaderProfileId?: string;
  status?: "waiting" | "started" | "completed";
  createdBy?: TeamMember;
  members?: TeamMember[];
};

interface StartGameControlsProps {
  mode: StartMode;
  onModeChange: (mode: StartMode) => void;
  teams: TeamSummary[];
  activeTeam: TeamSummary | null;
  selectedTeamId: string;
  onSelectedTeamIdChange: (teamId: string) => void;
  onCreateTeam: () => void;
  onJoinTeam: (teamId: string) => void;
  onLeaveTeam: () => void;
  isLeavingTeam: boolean;
  onStart: () => void;
  teamMessage: string;
  teamHasStarted: boolean;
  canStartTeam: boolean;
  isLoading: boolean;
  startButtonLabel: string;
  isSpaceTheme: boolean;
}

const getMemberName = (member: TeamMember) =>
  member.displayName?.trim() || member.username?.trim() || member.profileId || "Player";

export const StartGameControls = ({
  mode,
  onModeChange,
  teams,
  activeTeam,
  selectedTeamId,
  onSelectedTeamIdChange,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  isLeavingTeam,
  onStart,
  teamMessage,
  teamHasStarted,
  canStartTeam,
  isLoading,
  startButtonLabel,
  isSpaceTheme,
}: StartGameControlsProps) => {
  const teamLeaderProfileId = activeTeam?.leaderProfileId || activeTeam?.createdBy?.profileId;
  const teamLeader = activeTeam?.members?.find(
    (member) => member.profileId === teamLeaderProfileId,
  );
  const teamRoster =
    activeTeam ? (
      <section className="card small" aria-label="Your team">
        <div className="card-details grid gap-2">
          <h4 className="card-title">Team members</h4>
          <p className="p2 er-text er-team-roster__text">
            <strong>Leader:</strong>{" "}
            {teamLeader
              ? getMemberName(teamLeader)
              : getMemberName(activeTeam.createdBy || {})}
          </p>
          <ul className="grid gap-1">
            {(activeTeam.members || []).map((member, index) => (
              <li
                className="p2 er-text er-team-roster__text"
                key={member.profileId || `${activeTeam.id}-${index}`}
              >
                {getMemberName(member)}
                {member.profileId === teamLeaderProfileId ? " (Leader)" : ""}
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : null;

  const teamOptions = (
    <>
      {!teamHasStarted && (
        <>
          {activeTeam ? (
            <div className="grid gap-3 rounded-lg border border-slate-600/70 p-3">
              <button
                type="button"
                className="btn btn-outline w-full sm:w-auto"
                onClick={onLeaveTeam}
                disabled={isLoading || isLeavingTeam}
              >
                {isLeavingTeam ? "Leaving team…" : "Leave team"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={mode === "solo" ? "btn er-btn-primary" : "btn btn-outline"}
                  onClick={() => onModeChange("solo")}
                >
                  Solo
                </button>

                <button
                  type="button"
                  className={mode === "multiplayer" ? "btn er-btn-primary" : "btn btn-outline"}
                  onClick={() => onModeChange("multiplayer")}
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
                      onClick={onCreateTeam}
                      disabled={isLoading}
                    >
                      Create team
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
                        onChange={(event) => onSelectedTeamIdChange(event.target.value)}
                        disabled={isLoading}
                      >
                        <option value="">Select a team</option>

                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.createdBy?.displayName || team.createdBy?.username || "Team"} ·{" "}
                            {team.members?.length ?? 0} member
                            {team.members?.length === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>

                      {selectedTeamId && (
                        <button
                          type="button"
                          className="btn btn-outline w-full sm:w-auto"
                          onClick={() => onJoinTeam(selectedTeamId)}
                          disabled={isLoading}
                        >
                          Join selected team
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="p2 er-text">No teams are open yet. Create a team to invite others.</p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {teamRoster}
      {teamMessage && (isSpaceTheme || !teamHasStarted) && (
        <p className="p2 er-text">{teamMessage}</p>
      )}
    </>
  );

  const startButton = (
    <div className="card-actions mt-2">
      <button
        className="btn er-btn-primary w-full sm:w-auto"
        onClick={() => void onStart()}
        disabled={isLoading || !canStartTeam}
      >
        {mode === "multiplayer" ? "Start team run" : startButtonLabel}
      </button>
    </div>
  );

  return isSpaceTheme ? (
    <>
      <div className="card-details mt-2 grid gap-3">{teamOptions}</div>
      {startButton}
    </>
  ) : (
    <>
      {teamOptions}
      {startButton}
    </>
  );
};
