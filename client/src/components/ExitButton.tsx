import { backendAPI } from "@/utils";

export const ExitButton = ({ onExited }: { onExited?: () => void }) => {
  const handleExit = async () => {
    try {
      await backendAPI.post("/exit");
      onExited?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button className="btn btn-secondary" onClick={handleExit}>
      Exit Game
    </button>
  );
};

export default ExitButton;
