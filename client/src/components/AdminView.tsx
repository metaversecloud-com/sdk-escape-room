// Minimal placeholder for the admin panel toggled by the gear icon in PageContainer.
// Future admin features (puzzle reset, leaderboard moderation, etc.) belong here —
// add new server routes through backendAPI and call them from here.

import { content } from "@/constants";

const { admin } = content;

export const AdminView = () => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">{admin.title}</h3>
      <p className="card-description p2">{admin.placeholder}</p>
    </div>
  </div>
);

export default AdminView;
