export const Loading = () => {
  return (
    <div className="grid items-center py-8 w-full">
      <div className="mx-auto flex items-center gap-2" role="status" aria-label="Loading">
        <span className="block h-3 w-3 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
        <span className="block h-3 w-3 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
        <span className="block h-3 w-3 rounded-full bg-white animate-bounce" />
      </div>
    </div>
  );
};
