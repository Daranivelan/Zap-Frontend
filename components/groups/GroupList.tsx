import React, { useState } from "react";
import { useUserGroups } from "../../hooks/useGroups";
import CreateGroupModal from "./CreateGroupModal";

interface GroupListProps {
  onSelectGroup: (groupId: string) => void;
  selectedGroupId?: string;
}

const GroupList: React.FC<GroupListProps> = ({
  onSelectGroup,
  selectedGroupId,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // TanStack Query - automatic loading, error, refetch
  const { data: groups, isLoading, error } = useUserGroups();

  if (isLoading) {
    return <div className="p-4">Loading groups...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load groups</div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <h2 className="text-xl font-bold">Groups</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + New Group
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups?.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No groups yet. Create one to get started!
          </div>
        ) : (
          groups?.map((group) => (
            <div
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${
                selectedGroupId === group.id ? "bg-blue-50" : "bg-white"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-600 truncate">
                      {group.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {group.members?.length || 0} members
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default GroupList;
