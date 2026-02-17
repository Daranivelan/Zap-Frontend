"use client";

import React, { useState } from "react";
import {
  useGroup,
  useRemoveGroupMember,
  useLeaveGroup,
} from "@/hooks/useGroups";
import { getUserIdFromToken } from "@/services/auth.utils";
import AddMemberModal from "./AddMemberModal";

interface GroupDetailsProps {
  groupId: string;
  onClose: () => void;
  onGroupLeft?: () => void;
}

const GroupDetails: React.FC<GroupDetailsProps> = ({
  groupId,
  onClose,
  onGroupLeft,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const currentUser = getUserIdFromToken();

  const { data: group, isLoading } = useGroup(groupId);
  const removeMember = useRemoveGroupMember();
  const leaveGroup = useLeaveGroup();

  const currentMember = group?.members?.find(
    (m: any) => m.userId === currentUser,
  );
  const isAdmin = currentMember?.role === "admin";

  const handleRemoveMember = (memberId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    removeMember.mutate({ groupId, memberId });
  };

  const handleLeaveGroup = () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    leaveGroup.mutate(groupId, {
      onSuccess: () => {
        onGroupLeft?.();
        onClose();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="w-72 border-l border-white/6 bg-zinc-950/80 p-6 flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-72 border-l border-white/6 bg-zinc-950/80 flex flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Group Info</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Group info */}
        <div className="p-4 border-b border-white/6">
          <div className="w-14 h-14 bg-rose-500/15 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-rose-400 text-xl font-bold">
              {group?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h4 className="text-center text-zinc-200 font-semibold">
            {group?.name}
          </h4>
          {group?.description && (
            <p className="text-center text-zinc-500 text-xs mt-1">
              {group.description}
            </p>
          )}
          <p className="text-center text-zinc-600 text-[11px] mt-2 font-mono">
            Created {new Date(group?.createdAt || "").toLocaleDateString()}
          </p>
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Members ({group?.members?.length || 0})
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                + Add
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {group?.members?.map((member: any) => (
              <div
                key={member.userId}
                className="flex items-center justify-between px-3 py-2 hover:bg-white/2 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-zinc-400">
                      {member.user?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-zinc-300 truncate">
                        {member.user?.username || "Unknown"}
                      </span>
                      {member.userId === currentUser && (
                        <span className="text-zinc-600 text-[10px] shrink-0">
                          (you)
                        </span>
                      )}
                    </div>
                    {member.role === "admin" && (
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full font-medium">
                        admin
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && member.userId !== currentUser && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={removeMember.isPending}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1 shrink-0"
                    title="Remove member"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave group */}
        <div className="p-3 border-t border-white/6">
          <button
            onClick={handleLeaveGroup}
            disabled={leaveGroup.isPending}
            className="w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {leaveGroup.isPending ? "Leaving..." : "Leave Group"}
          </button>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          groupId={groupId}
          existingMemberIds={group?.members?.map((m: any) => m.userId) || []}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </>
  );
};

export default GroupDetails;
