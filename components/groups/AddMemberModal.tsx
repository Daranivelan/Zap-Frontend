"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/services/user.service";
import { useAddGroupMembers } from "@/hooks/useGroups";

interface AddMemberModalProps {
  groupId: string;
  existingMemberIds: string[];
  onClose: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  groupId,
  existingMemberIds,
  onClose,
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const addMembers = useAddGroupMembers();

  const availableUsers = allUsers.filter(
    (u: any) => !existingMemberIds.includes(u.id),
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = () => {
    if (selectedUsers.length === 0) return;
    addMembers.mutate(
      { groupId, memberIds: selectedUsers },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-white/6 rounded-xl p-5 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">Add Members</h2>

        {availableUsers.length === 0 ? (
          <p className="text-zinc-500 text-sm py-6 text-center">
            No users available to add
          </p>
        ) : (
          <div className="border border-white/6 rounded-lg max-h-56 overflow-y-auto mb-4">
            {availableUsers.map((user: any) => (
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
        )}

        <p className="text-xs text-zinc-500 mb-4">
          {selectedUsers.length} selected
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-white/6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || addMembers.isPending}
            className="px-4 py-2 text-sm bg-rose-500 hover:bg-rose-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-medium transition-all"
          >
            {addMembers.isPending ? "Adding..." : "Add Members"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
