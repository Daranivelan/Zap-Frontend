import React, { useState } from "react";
import { useCreateGroup } from "../../hooks/useGroups";
import { useSocket } from "../../contexts/SocketContext";
import { getUsers } from "../../services/user.service";
import { useQuery } from "@tanstack/react-query";

interface CreateGroupModalProps {
  onClose: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose }) => {
  const { socket } = useSocket();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const { mutate: createGroup, isPending } = useCreateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Group name is required");
      return;
    }

    createGroup(
      { name, description, memberIds: selectedUsers },
      {
        onSuccess: () => {
          socket?.emit("join_groups");
          onClose();
        },
        onError: (error) => {
          console.error("Failed to create group:", error);
          alert("Failed to create group");
        },
      },
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-white/6 rounded-xl p-5 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          Create New Group
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-white/6 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 transition-colors"
              placeholder="Enter group name"
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-white/6 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 transition-colors resize-none"
              placeholder="What's this group about?"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Add Members
            </label>
            <div className="border border-white/6 rounded-lg max-h-48 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/3 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selectedUsers.includes(user.id)
                        ? "bg-rose-500 border-rose-500"
                        : "border-zinc-600"
                    }`}
                  >
                    {selectedUsers.includes(user.id) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-zinc-400">
                      {user.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-300">{user.username}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedUsers.length} member
              {selectedUsers.length !== 1 ? "s" : ""} selected
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-white/6 rounded-lg transition-colors"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-rose-500 hover:bg-rose-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-medium transition-all"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
