/**
 * Team Members API functions
 */

import apiClient from "./client";
import type {
  ProjectMember,
  MemberInvite,
  MemberRoleUpdate,
  Invitation,
  Project,
  MessageResponse,
} from "./types";

export const membersApi = {
  /**
   * List all members of a project
   */
  list: async (projectId: string): Promise<ProjectMember[]> => {
    const response = await apiClient.get<ProjectMember[]>(
      `/projects/${projectId}/members`
    );
    return response.data;
  },

  /**
   * Invite a new member to a project
   */
  invite: async (projectId: string, data: MemberInvite): Promise<Invitation> => {
    const response = await apiClient.post<Invitation>(
      `/projects/${projectId}/members/invite`,
      data
    );
    return response.data;
  },

  /**
   * Update a member's role
   */
  updateRole: async (
    projectId: string,
    userId: string,
    data: MemberRoleUpdate
  ): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>(
      `/projects/${projectId}/members/${userId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove a member from a project
   */
  remove: async (projectId: string, userId: string): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(
      `/projects/${projectId}/members/${userId}`
    );
    return response.data;
  },

  /**
   * Get invitation details by token
   */
  getInvitation: async (token: string): Promise<Invitation> => {
    const response = await apiClient.get<Invitation>(`/invitations/${token}`);
    return response.data;
  },

  /**
   * Accept an invitation
   */
  acceptInvitation: async (token: string): Promise<Project> => {
    const response = await apiClient.post<Project>(`/invitations/${token}/accept`);
    return response.data;
  },
};

export default membersApi;

