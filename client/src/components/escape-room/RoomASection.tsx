import { useState } from "react";
import { backendAPI, setErrorMessage } from "@/utils";
import { ROOM_A_ANSWERS } from "@/constants/roomAAnswers";

interface VisitorData {
  puzzlesCompleted: {
    1: boolean;
    2: boolean;
    3: boolean;
    4: boolean;
    5: boolean;
    6: boolean;
  };
}

interface RoomASectionProps {
  visitorData: VisitorData;
  refreshGameState: () => Promise<void>;
  dispatch: any;
}

export const RoomASection = ({
  visitorData,
  refreshGameState,
  dispatch,
}: RoomASectionProps) => {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSwitches, setSelectedSwitches] = useState<string[]>([]);
  const [colorError, setColorError] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorsMatch =
    JSON.stringify(selectedColors) === JSON.stringify(ROOM_A_ANSWERS.colorSequence);

  const switchesMatch =
    JSON.stringify(selectedSwitches) === JSON.stringify(ROOM_A_ANSWERS.switchOrder);

  const toggleColor = (color: string) => {
    setColorError("");
    setSelectedColors((prev) => [...prev, color]);
  };

  const clearColors = () => {
    setSelectedColors([]);
    setColorError("");
  };

  const selectSwitch = (value: string) => {
    setSwitchError("");
    if (selectedSwitches.includes(value)) return;
    setSelectedSwitches((prev) => [...prev, value]);
  };

  const clearSwitches = () => {
    setSelectedSwitches([]);
    setSwitchError("");
  };

  const submitPuzzle = async (puzzleNumber: 1 | 2) => {
    setIsSubmitting(true);
    try {
      await backendAPI({
        endpoint: "/submit-puzzle",
        method: "POST",
        body: { puzzleNumber },
      });

      await refreshGameState();
    } catch (err) {
      setErrorMessage(dispatch, err as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitColors = async () => {
    if (!colorsMatch) {
      setColorError("That sequence is not correct.");
      return;
    }

    await submitPuzzle(1);
  };

  const handleSubmitSwitches = async () => {
    if (!switchesMatch) {
      setSwitchError("That switch order is not correct.");
      return;
    }

    await submitPuzzle(2);
  };

  return (
    <div className="container">
      <h2 className="h2">Room A</h2>

      {!visitorData.puzzlesCompleted[1] && (
        <div className="card">
          <div className="card-details">
            <h3 className="card-title">Puzzle 1: Color Sequence</h3>
            <p className="card-description p2">
              Enter the correct color sequence to restore the first control panel.
            </p>

            <p className="p2">Current sequence: {selectedColors.join(" → ") || "None"}</p>

            <div className="card-actions">
              <button className="btn btn-outline" onClick={() => toggleColor("red")}>Red</button>
              <button className="btn btn-outline" onClick={() => toggleColor("blue")}>Blue</button>
              <button className="btn btn-outline" onClick={() => toggleColor("green")}>Green</button>
              <button className="btn btn-outline" onClick={() => toggleColor("yellow")}>Yellow</button>
              <button className="btn btn-text" onClick={clearColors}>Clear</button>
            </div>

            {colorError && <p className="p2">{colorError}</p>}

            <div className="card-actions">
              <button className="btn" disabled={isSubmitting} onClick={handleSubmitColors}>
                Submit Puzzle 1
              </button>
            </div>
          </div>
        </div>
      )}

      {visitorData.puzzlesCompleted[1] && !visitorData.puzzlesCompleted[2] && (
        <div className="card">
          <div className="card-details">
            <h3 className="card-title">Puzzle 2: Switch Order</h3>
            <p className="card-description p2">
              Flip the switches in the correct order to unlock the next chamber.
            </p>

            <p className="p2">Current order: {selectedSwitches.join(" → ") || "None"}</p>

            <div className="card-actions">
              <button className="btn btn-outline" onClick={() => selectSwitch("1")}>Switch 1</button>
              <button className="btn btn-outline" onClick={() => selectSwitch("2")}>Switch 2</button>
              <button className="btn btn-outline" onClick={() => selectSwitch("3")}>Switch 3</button>
              <button className="btn btn-outline" onClick={() => selectSwitch("4")}>Switch 4</button>
              <button className="btn btn-text" onClick={clearSwitches}>Clear</button>
            </div>

            {switchError && <p className="p2">{switchError}</p>}

            <div className="card-actions">
              <button className="btn" disabled={isSubmitting} onClick={handleSubmitSwitches}>
                Submit Puzzle 2
              </button>
            </div>
          </div>
        </div>
      )}

      {visitorData.puzzlesCompleted[1] && visitorData.puzzlesCompleted[2] && (
        <div className="card">
          <div className="card-details">
            <h3 className="card-title">Room A Complete</h3>
            <p className="card-description p2">
              Nice work. You should now be moving into Room B.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomASection;